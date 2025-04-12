import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow/dist/layout/elkLayout";
import { create } from "zustand";
import { parser } from "src/containers/Editor/components/views/GraphView/lib/jsonParser";
import { getChildrenEdges } from "src/containers/Editor/components/views/GraphView/lib/utils/getChildrenEdges";
import { getOutgoers } from "src/containers/Editor/components/views/GraphView/lib/utils/getOutgoers";
import type { NodeData, EdgeData } from "src/types/graph";
import useJson from "../../../../../../store/useJson";
import { calculateIncomingEdges } from "../lib/utils/calculateIncomingEdges";
import { detectCycles } from "../lib/utils/detectCycles";
import { addNodeToGraph } from "../lib/utils/addNodeToGraph";
import { v4 as uuidv4 } from 'uuid';
import { generateRandomColor, getContrastColor } from "src/lib/utils/generateColors";
import { getLocaleNodes } from "../lib/utils/getLocaleNodes";
import { validateHiddenNodes } from "src/hooks/useToggleHide";
import CryptoJS from "crypto-js";

interface FilterInterface {
  "content-type": string,
  "locale": string,
  "workflow": string
}

interface Item {
  "uid": string,
  "title": string,
  "locale": string,
  "fallback_locale": null | string,
  "localised": boolean,
  "version": number,
  "content_type_uid": string,
  "references": any[],
  "variant_name": string,
  "variant_uid": string,
  "fallback_variant": string | null,
  "workflow_stage"?: string | null
}

function calculateNodeSize(item: any, isParent = false) {
  if (isParent) {
    return { width: item.text.length * 20, height: 50 };
  }

  if (item && item.data && item.data.type === "text") {
    return { width: item.text.length * 150, height: 50 };
  }

  const baseWidth = 200; // Base width
  const baseHeight = 100; // Base height
  const propertyCount = Object.keys(item).length;

  const width = baseWidth + propertyCount * 20; // Increase width for each property
  const height = baseHeight + propertyCount * 5; // Increase height for each property

  return { width, height };
}

export interface Graph {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  loading: boolean;
  graphCollapsed: boolean;
  fullscreen: boolean;
  collapseAll: boolean;
  nodes: any[];
  edges: EdgeData[];
  freqMap: any;
  expandedNodes: string[];
  highlighedPaths: Set<string>;
  highlightedNodes: Set<string>;
  currNode: string;
  collapsedNodes: string[];
  collapsedEdges: string[];
  collapsedParents: string[];
  selectedNode: NodeData | null;
  path: string;
  detectCycles: boolean;
  locale: string;
  nodeMapping: Map<string, string>,
  parentMapping: Map<string, Set<string>>,
  colorMap: Map<string, string[]>
  contentTypeCollection: Set<string>,
  localeCollection: Set<string>,
  workflowCollection: Set<string>,
  filter: FilterInterface | null
}

const initialStates: Graph = {
  viewPort: null,
  direction: "RIGHT",
  loading: true,
  graphCollapsed: false,
  fullscreen: false,
  collapseAll: false,
  nodes: [],
  edges: [],
  freqMap: new Map(),
  detectCycles: false,
  locale: "",
  highlighedPaths: new Set([]),
  highlightedNodes: new Set([]),
  currNode: "",
  expandedNodes: [],
  collapsedNodes: [],
  collapsedEdges: [],
  collapsedParents: [],
  selectedNode: null,
  path: "",
  nodeMapping: new Map(),
  parentMapping: new Map(),
  colorMap: new Map(),
  contentTypeCollection: new Set(),
  localeCollection: new Set(["all"]),
  workflowCollection: new Set(),
  filter: {
    "content-type": "",
    "locale": "",
    "workflow": ""
  } as FilterInterface
};

export interface GraphActions {
  setGraph: (json?: string, options?: Partial<Graph>[]) => void;
  setLoading: (loading: boolean) => void;
  setDirection: (direction: CanvasDirection) => void;
  setViewPort: (ref: ViewPort) => void;
  setSelectedNode: (nodeData: NodeData) => void;
  focusFirstNode: () => void;
  expandNodes: (nodeId: string) => void;
  expandGraph: () => void;
  setDetectCycles: (detection: boolean) => void,
  collapseNodes: (nodeId: string) => void;
  collapseGraph: () => void;
  getCollapsedNodeIds: () => string[];
  getCollapsedEdgeIds: () => string[];
  toggleFullscreen: (value: boolean) => void;
  toggleCollapseAll: (value: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerView: () => void;
  clearGraph: () => void;
  setZoomFactor: (zoomFactor: number) => void;
  setLocale: (locale: string) => void;
  resetFreqMap: () => void;
  setHighlightedPaths: (paths: string[], nodes: string[], nodeId: string) => void;
  setFilterVisibility: (locale: string, filterType: string) => void;
  setFilter: (type: string, filter: string) => void
}

const useGraph = create<Graph & GraphActions>((set, get) => ({
  ...initialStates,
  toggleCollapseAll: collapseAll => {
    set({ collapseAll });
    get().collapseGraph();
  },
  clearGraph: () => set({ nodes: [], edges: [], loading: false }),
  getCollapsedNodeIds: () => get().collapsedNodes,
  getCollapsedEdgeIds: () => get().collapsedEdges,
  setSelectedNode: nodeData => set({ selectedNode: nodeData }),
  resetFreqMap: () => set({ freqMap: new Map() }),
  setGraph: async (data, options) => {
    const localeMap = new Map();

    const encryptedData = new URL(window.location.href).searchParams.get("data");

    if (!encryptedData) {
      console.error("No encrypted data found in URL");
    } else {
      try {
        // convert base64 to bytes
        const convertData = atob(encryptedData);
        const decryptedResultBytes = CryptoJS.AES.decrypt(
          convertData,
          process.env.NEXT_PUBLIC_ENCRYPT_SECRET as string
        );

        const decryptedResultString = decryptedResultBytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedResultString) {
          throw new Error("Decryption failed, possibly due to incorrect key or corrupted data");
        }

        const decryptedResult = JSON.parse(decryptedResultString);

        if (!decryptedResult.contentType || !decryptedResult.entryUid) {
          throw "Content type and entry uid are required";
        }

        const response = await fetch(`http://localhost:3002/api/v3/items/bfs/content_types/${decryptedResult.contentType}/entries/${decryptedResult.entryUid}`, {
          method: "GET",
          headers: {
            api_key: decryptedResult.stackAPI || ""
          }
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Readable stream not supported");
        }

        let receivedData = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          receivedData += chunk;

          const lines = receivedData.split("\n");
          receivedData = lines.pop() || "";

          lines.forEach((line) => {
            try {
              const parsed = JSON.parse(line);
              const items = parsed.items;

              console.log("items", items);

              items.forEach((item: Item) => {
                // format - uid.variant.locale
                // base - uid.variant

                let refUid = `${item.uid}.${item.variant_uid}`;

                // when variant is base_variant
                if (item.variant_uid === "base_variant") {

                  // add color to node based on content type
                  if (!get().colorMap.get(item.content_type_uid)) {
                    const bgColor = generateRandomColor();
                    set({ colorMap: new Map([...get().colorMap, [item.content_type_uid, [bgColor, getContrastColor(bgColor)]]]) });
                  }

                  const { width, height } = calculateNodeSize(item);

                  // when master locale or parent entry is encountered
                  if (item.fallback_locale === null) {
                    const node = {
                      id: uuidv4(),
                      text: [
                        [item.uid === decryptedResult.entryUid ? "Parent Entry" : "Master Locale"],
                        [item.title],
                        ["locale", item.locale],
                        ["content_type_uid", item.content_type_uid]
                      ],
                      width,
                      height,
                      isError: Math.random() > 0.5,
                      color: [get().colorMap.get(item.content_type_uid)?.[0], get().colorMap.get(item.content_type_uid)?.[1]],
                      data: {
                        type: "object",
                        isParent: false,
                        isEmpty: false,
                        childrenCount: 0,
                      },
                    };

                    set({ nodeMapping: new Map([...get().nodeMapping, [`${item.uid}.${item.variant_uid}`, node.id]]) });
                    set({ nodes: [...get().nodes, node] });
                  }
                  else {
                    refUid += `.${item.locale}`;
                    // when other locales are encountered

                    // create localised node
                    const node = {
                      id: uuidv4(),
                      text: [
                        [item.title],
                        ["locale", item.locale],
                        ["content_type_uid", item.content_type_uid]
                      ],
                      width,
                      height,
                      isError: Math.random() > 0.5,
                      color: [get().colorMap.get(item.content_type_uid)?.[0], get().colorMap.get(item.content_type_uid)?.[1]],
                      data: {
                        type: "object",
                        isParent: false,
                        isEmpty: false,
                        childrenCount: 0,
                      },
                    };

                    set({ nodeMapping: new Map([...get().nodeMapping, [`${item.uid}.${item.variant_uid}.${item.locale}`, node.id]]) });
                    set({ nodes: [...get().nodes, node] });

                    // create localised entries block if not created
                    if (!get().nodeMapping.get(`localised-${item.uid}`)) {
                      const localisedEntriesBlock = {
                        id: uuidv4(),
                        text: "localised_entries",
                        width: 0,
                        height: 0,
                        isError: Math.random() > 0.5,
                        color: ["white", "black"],
                        data: {
                          type: "array",
                          isParent: true,
                          isEmpty: false,
                          childrenCount: items.length,
                        },
                      }

                      const { width: refWidth, height: refHeight } = calculateNodeSize(localisedEntriesBlock, true);

                      localisedEntriesBlock.width = refWidth;
                      localisedEntriesBlock.height = refHeight;

                      set({ nodeMapping: new Map([...get().nodeMapping, [`localised-${item.uid}`, localisedEntriesBlock.id]]) });
                      set({ nodes: [...get().nodes, localisedEntriesBlock] });
                    }

                    // connect localised entries block to locale nodes
                    const localisedEntriesNodeEdge = {
                      id: `e${get().nodeMapping.get(`localised-${item.uid}`)}-${node.id}`,
                      from: get().nodeMapping.get(`localised-${item.uid}`) || "",
                      to: node.id
                    }

                    set({ edges: [...get().edges, localisedEntriesNodeEdge] });

                    // since the locale do not come in a sorted manner in the apis need to track a localeMap for connecting localised entries block and locale node
                    localeMap.set(get().nodeMapping.get(`localised-${item.uid}`), `${item.uid}.${item.variant_uid}`);
                  }

                }
                else {
                  // when variant is present
                  // check if the variants block is created to that particular uid
                  // display variant with no fallback_variants
                  if (!item.fallback_variant) {
                    if (!get().nodeMapping.get(`variant-${item.uid}`)) {
                      // create variants block
                      const variantsNode = {
                        id: uuidv4(),
                        text: "variants",
                        width: 0,
                        height: 0,
                        isError: Math.random() > 0.5,
                        color: ["white", "black"],
                        data: {
                          type: "array",
                          isParent: true,
                          isEmpty: false,
                          childrenCount: items.length,
                        },
                      }

                      const { width: refWidth, height: refHeight } = calculateNodeSize(variantsNode, true);

                      variantsNode.width = refWidth;
                      variantsNode.height = refHeight;

                      set({ nodeMapping: new Map([...get().nodeMapping, [`variant-${item.uid}`, variantsNode.id]]) });
                      set({ nodes: [...get().nodes, variantsNode] });

                      // connect to the item.uid base_variant
                      const variantEdge = {
                        id: `e${get().nodeMapping.get(`${item.uid}.${item.variant_uid}`)}-${variantsNode.id}`,
                        from: get().nodeMapping.get(`${item.uid}.base_variant`) || "",
                        to: variantsNode.id
                      }

                      set({ edges: [...get().edges, variantEdge] });
                    }

                    // create variant name node specific to item uid if not done
                    if (!get().nodeMapping.get(`${item.variant_name}.${item.uid}`)) {
                      const eachVariantNode = {
                        id: uuidv4(),
                        text: [
                          [item.variant_name]
                        ],
                        width: 0,
                        height: 0,
                        isError: Math.random() > 0.5,
                        color: [get().colorMap.get(`variant_node`)?.[0], get().colorMap.get(`variant_node`)?.[1]],
                        data: {
                          type: "text",
                          isParent: false,
                          isEmpty: false,
                          childrenCount: 0,
                        },
                      };

                      const { width: eachVariantWidth, height: eachVariantHeight } = calculateNodeSize(eachVariantNode, false);

                      eachVariantNode.width = eachVariantWidth;
                      eachVariantNode.height = eachVariantHeight;

                      set({ nodeMapping: new Map([...get().nodeMapping, [`${item.variant_name}.${item.uid}`, eachVariantNode.id]]) });
                      set({ nodes: [...get().nodes, eachVariantNode] });

                      const variantNameEdge = {
                        id: `e${get().nodeMapping.get(`variant-${item.uid}`)}-${eachVariantNode.id}`,
                        from: get().nodeMapping.get(`variant-${item.uid}`) || "",
                        to: eachVariantNode.id
                      }

                      set({ edges: [...get().edges, variantNameEdge] });
                    }
                    // create item.uid specfic variant node and connect it to respective variant name node if not done
                    if (item.fallback_locale === null) {
                      if (!get().nodeMapping.get(`${item.uid}.${item.variant_uid}`)) {
                        const variantNode = {
                          id: uuidv4(),
                          text: [
                            [item.uid === decryptedResult.entryUid ? "Parent Entry" : "Master Locale"],
                            [item.title || get().nodes.find(node => node.id === get().nodeMapping.get(`${item.uid}.base_variant`))?.text?.[1][0]],
                            ["locale", item.locale],
                            ["content_type_uid", item.content_type_uid]
                          ],
                          width: 0,
                          height: 0,
                          isError: Math.random() > 0.5,
                          color: [get().colorMap.get(item.content_type_uid)?.[0], get().colorMap.get(item.content_type_uid)?.[1]],
                          data: {
                            type: "object",
                            isParent: false,
                            isEmpty: false,
                            childrenCount: 0,
                          },
                        };

                        const { width, height } = calculateNodeSize(variantNode, false);

                        variantNode.width = width;
                        variantNode.height = height;

                        set({ nodeMapping: new Map([...get().nodeMapping, [`${item.uid}.${item.variant_uid}`, variantNode.id]]) });
                        set({ nodes: [...get().nodes, variantNode] });

                        // connect master locale variant to variant name
                        const variantNodeNameEdge = {
                          id: `e${get().nodeMapping.get(`${item.variant_name}.${item.uid}`)}-${variantNode.id}`,
                          from: get().nodeMapping.get(`${item.variant_name}.${item.uid}`) || "",
                          to: variantNode.id
                        }

                        set({ edges: [...get().edges, variantNodeNameEdge] });
                      }
                    }
                    else {
                      refUid += `.${item.locale}`;

                      // create variant node locale specific if not done
                      if (!get().nodeMapping.get(`${item.uid}.${item.variant_uid}.${item.locale}`)) {
                        const variantLocalisedNode = {
                          id: uuidv4(),
                          text: [
                            ["Master Locale"],
                            [item.title || get().nodes.find(node => node.id === get().nodeMapping.get(`${item.uid}.base_variant.${item.locale}`))?.text?.[0][0]],
                            ["locale", item.locale],
                            ["content_type_uid", item.content_type_uid]
                          ],
                          width: 0,
                          height: 0,
                          isError: Math.random() > 0.5,
                          color: [get().colorMap.get(item.content_type_uid)?.[0], get().colorMap.get(item.content_type_uid)?.[1]],
                          data: {
                            type: "object",
                            isParent: false,
                            isEmpty: false,
                            childrenCount: 0,
                          },
                        };

                        const { width, height } = calculateNodeSize(variantLocalisedNode, false);

                        variantLocalisedNode.width = width;
                        variantLocalisedNode.height = height;

                        set({ nodeMapping: new Map([...get().nodeMapping, [`${item.uid}.${item.variant_uid}.${item.locale}`, variantLocalisedNode.id]]) });
                        set({ nodes: [...get().nodes, variantLocalisedNode] });

                        // connect master locale variant to variant name
                        const variantNodeNameEdge = {
                          id: `e${get().nodeMapping.get(`${item.variant_name}.${item.uid}`)}-${variantLocalisedNode.id}`,
                          from: get().nodeMapping.get(`${item.variant_name}.${item.uid}`) || "",
                          to: variantLocalisedNode.id
                        }

                        set({ edges: [...get().edges, variantNodeNameEdge] });

                        console.log(item.uid);
                      }
                    }
                  }
                }

                // map the references the so that parent can to connect to child easily
                item.references.forEach((ref) => {
                  set({ parentMapping: new Map([...get().parentMapping, [refUid, new Set([...(get().parentMapping.get(refUid) || []), ref.uid])]]) });
                });

                set({ contentTypeCollection: new Set([...get().contentTypeCollection, item.content_type_uid]) });
                set({ localeCollection: new Set([...get().localeCollection, item.locale]) });
                if (item.workflow_stage) {
                  set({ workflowCollection: new Set([...get().workflowCollection, item.workflow_stage]) });
                }
              });

              // connect item uid base to respective localised entries (to avoid invalid graph structure)
              Array.from(localeMap).forEach((value) => {
                const childId = value[0];
                const parentId = value[1];

                const localisedEdge = {
                  id: `e${get().nodeMapping.get(parentId)}-${childId}`,
                  from: get().nodeMapping.get(parentId) || "",
                  to: childId
                }

                const isEdgeRefPresent = get().edges.find(edge => edge.id === localisedEdge.id);
                if (!isEdgeRefPresent) {
                  set({ edges: [...get().edges, localisedEdge] });
                }
              });

              // adding references in the graph
              Array.from(get().parentMapping).forEach((value) => {
                const parent = get().nodeMapping.get(value[0]);
                const children = Array.from(value[1]);

                children.forEach(child => {
                  const childId = get().nodeMapping.get(`${child}.base_variant`);

                  // connect parent and child
                  if (childId && parent) {
                    const parentNode = get().nodes.find(node => node.id === parent);
                    const childNode = get().nodes.find(node => node.id === childId);
                    console.log(childNode);

                    // create reference block specific to item uid if not done
                    if (!get().nodeMapping.get(`reference-${parentNode.id}`)) {
                      const refBlock = {
                        id: uuidv4(),
                        text: `${parentNode.text.find(t => t[0] === "content_type_uid")[1]} -> ${childNode.text.find(t => t[0] === "content_type_uid")[1]}`,
                        width: 0,
                        height: 0,
                        isError: Math.random() > 0.5,
                        color: ["white", "black"],
                        data: {
                          type: "array",
                          isParent: true,
                          isEmpty: false,
                          childrenCount: 1,
                        },
                      };

                      const { width: refWidth, height: refHeight } = calculateNodeSize(refBlock, true);

                      refBlock.width = refWidth;
                      refBlock.height = refHeight;

                      set({ nodeMapping: new Map([...get().nodeMapping, [`reference-${parentNode.id}`, refBlock.id]]) });
                      set({ nodes: [...get().nodes, refBlock] });

                      // connect ref block to parent node
                      const refEdge = {
                        id: `e${parent}-${refBlock.id}`,
                        from: parent,
                        to: refBlock.id
                      }

                      set({ edges: [...get().edges, refEdge] });
                    }

                    // connect reference block to child
                    const refBlockId = get().nodeMapping.get(`reference-${parentNode.id}`);

                    const refChildEdge = {
                      id: `e${refBlockId}-${childId}`,
                      from: refBlockId || "",
                      to: childId
                    }

                    const isRefChildEdgePresent = get().edges.find(edge => edge.id === refChildEdge.id);

                    if (refBlockId && !isRefChildEdgePresent) {
                      set({ edges: [...get().edges, refChildEdge] });
                    }
                  }
                });
              });

              console.log(get().nodeMapping, get().parentMapping);

              //-------------------------------------------------------------------------------------------------------------------------------------

              // ignore
              // if (testing) {
              //   let parentNode = items.length > 0 && items?.[0];

              //   /** Variant integration for the parent entry **/
              //   if (parentNode && parentNode.uid === decryptedResult.entryUid) {
              //     const masterNode = items.find((item: any) => item.fallback_locale === null && item.variant_uid === "base_variant");
              //     defaultParentTitle = masterNode.title;

              //     if (!get().colorMap.get(masterNode.content_type_uid)) {
              //       const bgColor = generateRandomColor();
              //       set({ colorMap: new Map([...get().colorMap, [masterNode.content_type_uid, [bgColor, getContrastColor(bgColor)]]]) });
              //     }

              //     const { width, height } = calculateNodeSize(masterNode);

              //     const node = {
              //       id: uuidv4(),
              //       text: [
              //         ["Parent Entry"],
              //         // ["uid", masterNode.uid],
              //         [masterNode.title],
              //         ["locale", masterNode.locale],
              //         // ["localised", masterNode.localised],
              //         ["content_type_uid", masterNode.content_type_uid]
              //       ],
              //       width,
              //       height,
              //       isError: Math.random() > 0.5,
              //       color: [get().colorMap.get(masterNode.content_type_uid)?.[0], get().colorMap.get(masterNode.content_type_uid)?.[1]],
              //       data: {
              //         type: "object",
              //         isParent: false,
              //         isEmpty: false,
              //         childrenCount: 0,
              //       },
              //     };

              //     let variantsNode = {
              //       id: uuidv4(),
              //       text: "variants",
              //       width,
              //       height,
              //       isError: Math.random() > 0.5,
              //       color: ["white", "black"],
              //       data: {
              //         type: "array",
              //         isParent: true,
              //         isEmpty: false,
              //         childrenCount: items.length,
              //       },
              //     }

              //     const { width: variantsWidth, height: variantsHeight } = calculateNodeSize(variantsNode, true);

              //     variantsNode = { ...variantsNode, width: variantsWidth, height: variantsHeight };

              //     const variantsEdge = {
              //       id: `e${node.id}-${variantsNode.id}`,
              //       from: node.id,
              //       to: variantsNode.id
              //     }

              //     set({ nodeMapping: new Map([...get().nodeMapping, [`${masterNode.uid}_base`, node.id]]) });

              //     set({ nodes: [...get().nodes, node] });

              //     if (!(items.every((item) => item.variant_uid === "base_variant"))) {
              //       noVariants = false;
              //       set({ nodes: [...get().nodes, variantsNode] });
              //       set({ edges: [...get().edges, variantsEdge] });

              //       // parent variants to be joined to variants block
              //       items.forEach((item: any) => {
              //         if (!get().colorMap.get(`variant_node`)) {
              //           const bgColor = generateRandomColor();
              //           set({ colorMap: new Map([...get().colorMap, [`variant_node`, [bgColor, getContrastColor(bgColor)]]]) });
              //         }

              //         let eachVariantNode = {
              //           id: uuidv4(),
              //           text: [
              //             [item.variant_name]
              //           ],
              //           width,
              //           height,
              //           isError: Math.random() > 0.5,
              //           color: [get().colorMap.get(`variant_node`)?.[0], get().colorMap.get(`variant_node`)?.[1]],
              //           data: {
              //             type: "text",
              //             isParent: false,
              //             isEmpty: false,
              //             childrenCount: 0,
              //           },
              //         };

              //         const { width: eachVariantWidth, height: eachVariantHeight } = calculateNodeSize(eachVariantNode, false);

              //         eachVariantNode = {
              //           ...eachVariantNode,
              //           width: eachVariantWidth,
              //           height: eachVariantHeight
              //         }

              //         // if item variant uid already present then do not add that node
              //         if (!get().nodeMapping.has(`${item.variant_uid}_variant`)) {
              //           if (item.variant_uid === "base_variant") {
              //             nodesToRemove.add(eachVariantNode);
              //           }
              //           set({ nodeMapping: new Map([...get().nodeMapping, [`${item.variant_uid}_variant`, eachVariantNode.id]]) })
              //           set({ nodes: [...get().nodes, eachVariantNode] });
              //           const egdeFromEachVariant = {
              //             id: `e${variantsNode.id}-${eachVariantNode.id}`,
              //             from: variantsNode.id,
              //             to: eachVariantNode.id
              //           }

              //           set({ edges: [...get().edges, egdeFromEachVariant] });
              //         }
              //       });
              //     }
              //   }

              //   // setting localeMap to get the total number of locales
              //   items.forEach((item: any) => {
              //     if (item.localised) {
              //       const existingEntry = localeMap.get(item.fallback_variant || item.variant_uid || item.uid);
              //       const locales = existingEntry?.locale || new Set();

              //       if (!locales.has(item.locale)) {
              //         localeMap.set(item.fallback_variant || item.variant_uid || item.uid, {
              //           locale: locales.add(item.locale),
              //           value: existingEntry?.value ? existingEntry.value + 1 : 1
              //         });
              //       }
              //     }
              //   });

              //   // determine the base item parent node and create localised_entries node and connect them
              //   /*** should optimise this by choosing english as the master language and create a base parent node using the cma api ***/
              //   // creates the base node for each entry and localised entries block and joins them
              //   items.forEach((item: any) => {
              //     if (item.uid !== parentNode.uid) {
              //       parentNode = item;
              //     }

              //     // making the master locale and main variants base entry and localised_entries block
              //     if ((item.fallback_locale === null || ((item.fallback_locale !== null && item.localised) && item.variant_uid)) && !item.fallback_variant) {
              //       // already master locale present do not create a new one unless it is master locale appeared
              //       if (!item.variant_uid || !(item.variant_uid && get().nodeMapping.has(`${item.variant_uid}_base`)) || (get().nodeMapping.has(`${item.variant_uid}_base`) && item.fallback_locale === null)) {

              //         if (get().nodeMapping.has(`${item.variant_uid}_base`) && item.fallback_locale === null) {
              //           let nodeToRemove = get().nodes.find(node => node.id === get().nodeMapping.get(`${item.variant_uid}_base`));
              //           if (nodeToRemove) {
              //             nodesToRemove.add(nodeToRemove);
              //           }

              //           nodeToRemove = get().nodes.find(node => node.id === get().nodeMapping.get(`${item.variant_uid}_localised`));
              //           if (nodeToRemove) {
              //             nodesToRemove.add(nodeToRemove);
              //           }
              //         }

              //         // create a parentId  is present
              //         const { width, height } = calculateNodeSize(parentNode);

              //         if (!get().colorMap.get(item.content_type_uid)) {
              //           const bgColor = generateRandomColor();
              //           set({ colorMap: new Map([...get().colorMap, [item.content_type_uid, [bgColor, getContrastColor(bgColor)]]]) });
              //         }

              //         const node = {
              //           id: uuidv4(),
              //           text: [
              //             ["Master Locale"],
              //             // ["uid", item.uid],
              //             [item.title ? item.title : defaultParentTitle],
              //             ["locale", item.locale],
              //             // ["localised", item.localised],
              //             ["content_type_uid", item.content_type_uid]
              //           ],
              //           width,
              //           height,
              //           isError: Math.random() > 0.5,
              //           color: [get().colorMap.get(item.content_type_uid)?.[0], get().colorMap.get(item.content_type_uid)?.[1]],
              //           data: {
              //             type: "object",
              //             isParent: false,
              //             isEmpty: false,
              //             childrenCount: 0,
              //           },
              //         };

              //         const localisedNode = {
              //           id: uuidv4(),
              //           text: "localised_entries",
              //           width,
              //           height,
              //           isError: Math.random() > 0.5,
              //           color: ["white", "black"],
              //           data: {
              //             type: "array",
              //             isParent: true,
              //             isEmpty: false,
              //             childrenCount: 1,
              //           },
              //         };

              //         const { width: localisedWidth, height: localisedHeight } = calculateNodeSize(localisedNode, true);

              //         localisedNode.width = localisedWidth;
              //         localisedNode.height = localisedHeight;

              //         // master locale needs to be added irrespective of parent node or child node
              //         // if variants are present we need parent based master locales
              //         if (!(item.uid === decryptedResult.entryUid && noVariants)) {
              //           // when the parent has no variants no master locales to be shown direct edge to references
              //           set({ nodeMapping: new Map([...get().nodeMapping, [`${item.variant_uid || item.uid}_base`, node.id]]) });
              //           set({ nodes: [...get().nodes, node] });

              //           // remove if base_variant master locale formed parent entry does its work
              //           if (item.variant_uid === "base_variant") {
              //             nodesToRemove.add(node);
              //           }
              //         }

              //         // localised needs to be created based on count of locales
              //         if (localeMap.has(item.fallback_variant || item.variant_uid || item.uid) &&
              //           localeMap.get(item.fallback_variant || item.variant_uid || item.uid)?.locale.size > 1
              //         ) {
              //           set({ nodeMapping: new Map([...get().nodeMapping, [`${item.fallback_variant || item.variant_uid || item.uid}_localised`, localisedNode.id]]) })
              //           set({ nodes: [...get().nodes, localisedNode] });

              //           const nodeId = (item.uid === decryptedResult.entryUid && ((noVariants || !item.fallback_locale) && (!item.variant_uid || item.variant_uid === "base_variant"))) ? get().nodeMapping.get(`${item.uid}_base`) : node.id;
              //           // const nodeId = get().nodeMapping.get(`${item.uid}_base`);

              //           const edge = {
              //             id: `${nodeId}-${localisedNode.id}`,
              //             from: nodeId as string,
              //             to: localisedNode.id
              //           }

              //           set({ edges: [...get().edges, edge] });
              //         }
              //       }
              //     }
              //   });

              //   // create object nodes and joins with their respective localised entries block
              //   items.forEach((item: any) => {
              //     const { width, height } = calculateNodeSize(item);

              //     if (!get().colorMap.has(item.content_type_uid)) {
              //       const bgColor = generateRandomColor();
              //       set({ colorMap: new Map([...get().colorMap, [item.content_type_uid, [bgColor, getContrastColor(bgColor)]]]) });
              //     }

              //     const node = {
              //       id: uuidv4(),
              //       text: [
              //         // ["uid", item.uid],
              //         [item.title ? item.title : defaultParentTitle], // in some cases title may be undefined where there is no variant changes
              //         ["locale", item.locale],
              //         // ["fallback", item.fallback_locale],
              //         // ["localised", item.localised],
              //         ["content_type_uid", item.content_type_uid],
              //       ],
              //       width,
              //       height,
              //       isError: Math.random() > 0.5,
              //       color: [get().colorMap.get(item.content_type_uid)?.[0], get().colorMap.get(item.content_type_uid)?.[1]],
              //       data: {
              //         type: "object",
              //         isParent: false,
              //         isEmpty: false,
              //         childrenCount: 0,
              //       },
              //     };

              //     if (item.workflow_stage) {
              //       node.text.push(["workflow_stage", item.workflow_stage]);
              //     }

              //     // create nodes if only localised
              //     if (item.localised) {
              //       // locale based uid
              //       let itemUid = `${item.uid}-${item.locale}`;

              //       // if the item is a variant block
              //       if (!noVariants && item.variant_uid) {
              //         // if no localisation then point to the parent entry
              //         if (item.variant_uid && localeMap.get(item.variant_uid)?.locale.size === 1) {
              //           itemUid = `${item.variant_uid}_base`;
              //         }
              //         else {
              //           // if the fallback is base_variant then the variant block must point to base entry of base_variant
              //           itemUid += (item.fallback_variant === "base_variant") ? `-${item.fallback_variant}-variant` : `-${item.variant_uid}-variant`;
              //         }

              //         const mappedParents = get().parentMapping.get(itemUid) || [];

              //         set({ parentMapping: new Map([...get().parentMapping, [itemUid, new Set([...mappedParents, `${item.variant_uid}_variant`])]]) });
              //       }

              //       // track the parent of the references
              //       item.references.forEach((ref: any) => {
              //         // a little hack to negate with the inform data sent by the backend api due to the inconsistency in the varaint api
              //         let refUid = `${ref.uid}-${ref.absolutePath ? ref.locale : item.locale}`;

              //         // if not localised then revert to fallback
              //         if (!ref.localised) {
              //           refUid = `${ref.uid}-${ref.fallback_locale}`;
              //         }

              //         if (ref.variant_uid) {
              //           refUid += `-${ref.variant_uid}`;
              //           const mappedParents = get().parentMapping.get(refUid) || [];
              //           set({ parentMapping: new Map([...get().parentMapping, [refUid, new Set([...mappedParents, ref.variant_uid])]]) });
              //         }
              //         else {
              //           const mappedParents = get().parentMapping.get(refUid) || [];
              //           set({ parentMapping: new Map([...get().parentMapping, [refUid, new Set([...mappedParents, itemUid])]]) });
              //         }
              //       });

              //       // if itemUid does not exist -> then create a new node
              //       if (!get().nodeMapping.has(itemUid)) {
              //         const parentUid = get().nodeMapping.get(`${item.fallback_variant || item.variant_uid || item.uid}_localised`);

              //         const edge = {
              //           id: `e${parentUid}-${node.id}`,
              //           from: parentUid || "",
              //           to: node.id || ""
              //         }

              //         // if the item has only one localised entry do not add the localised based node
              //         if (localeMap.get(item.fallback_variant || item.variant_uid || itemUid.split("-")[0])?.locale.size > 1) {
              //           // add the node if the the locale is same as master locale ie. fallback_locale = null

              //           // seems like an edge case where master locale could have a fallback_locale
              //           if (item.fallback_locale === null) {
              //             nodesToRemove.add(node);
              //           }

              //           set({ nodes: [...get().nodes, node] });
              //           set({ nodeMapping: new Map([...get().nodeMapping, [itemUid, node.id]]) });
              //           // if localised entries is present then connect
              //           if (parentUid && node.id) {
              //             set({ edges: [...get().edges, edge] });
              //           }
              //         }
              //       }

              //       // find if any parents are present to current item
              //       const parents = get().parentMapping.get(itemUid) || [];
              //       const parentNodeIds = Array.from(parents).map(parent => get().nodeMapping.get(parent));

              //       /** cyclic dependency isnt working well because we are adding the edges from current state and not from future state */
              //       parentNodeIds.forEach(pId => {
              //         let parentNodeId = pId;
              //         // create the edge
              //         // the childId could be normal block or variant block or also fallback_variant block
              //         const childId = get().nodeMapping.get(`${item.fallback_variant || item.variant_uid || item.uid}_base`);

              //         // parent node find the mapped id via which we can split and make the parentNodeId_base
              //         let baseParent = Array.from(parents).find((parent) => get().nodeMapping.get(parent) === parentNodeId);

              //         let localeFinder = baseParent?.split("-")[0];
              //         let onlyVariantFinder = false;

              //         // to handle _variant mapped locale
              //         if (!noVariants && baseParent?.endsWith("_variant")) {
              //           if (baseParent.includes("base_variant")) {
              //             localeFinder = "base_variant";
              //           }
              //           else {
              //             localeFinder = baseParent.split("_")[0];
              //           }
              //           onlyVariantFinder = true;
              //         }

              //         // base variant base needs to be replaced by parent entry as base variant direction is completely removed
              //         if (localeFinder === "base_variant_base") {
              //           localeFinder = decryptedResult.entryUid;
              //         }

              //         // make the localeFinder equated to variant id if and only if it isnt included in nodesToRemove
              //         if (!Array.from(nodesToRemove).find((node: any) => node.id === Array.from(get().nodeMapping).find((node) => node[0] === baseParent)?.[1]) &&
              //           !onlyVariantFinder && !noVariants && baseParent?.endsWith("-variant")) {
              //           const baseParentArray = baseParent.split("-");
              //           localeFinder = baseParentArray[baseParentArray.length - 2];
              //         }

              //         // if the baseParent's localised entries === 1 make sure that it points to base
              //         if (localeMap.get(localeFinder)?.locale.size === 1) {
              //           // when there are variants present and baseParent ends with -variants with no localisation it means convert baseParent to variant parent not parent entry
              //           // if (!onlyVariantFinder && !noVariants && baseParent?.endsWith("-variant")) {
              //           //   const baseParentArray = baseParent.split("-");
              //           //   localeFinder = baseParentArray[baseParentArray.length - 2];
              //           // }
              //           parentNodeId = get().nodeMapping.get(!onlyVariantFinder ? `${localeFinder}_base` : `${localeFinder}_variant`);
              //         }

              //         // need to check if the parent has master locale if yes need to point it to parent_base
              //         const baseParentNode = get().nodes.find((node) => node.id === get().nodeMapping.get(baseParent as string));
              //         const baseMasterNode = get().nodes.find((node) => node.id === get().nodeMapping.get(!onlyVariantFinder ? `${localeFinder}_base` : `${localeFinder}_variant`))

              //         /* If both has same locale it means it is a duplicate locale so ensure to point its references to baseMasterNode */
              //         if ((!baseParent?.endsWith("-variant") || baseParent.includes("base_variant")) && baseParentNode && baseMasterNode && baseParentNode?.text?.find(node => node[0] === "locale")?.[1] === baseMasterNode?.text?.find(node => node[0] === "locale")?.[1]) {
              //           parentNodeId = baseMasterNode?.id;
              //         }

              //         if (parentNodeId && childId) {
              //           // when variant block needs to connect - connect directly without references block
              //           if (onlyVariantFinder) {
              //             const variantEdge = { id: `e${parentNodeId}-${childId}`, from: parentNodeId, to: childId };
              //             if (!get().edges.find(e => e.id === variantEdge.id)) {
              //               set({ edges: [...get().edges, variantEdge] })
              //             }
              //           }
              //           else {
              //             // have to add references block
              //             let refs = "references";
              //             const findParentNode = get().nodes.find(node => node.id === parentNodeId);
              //             const findChildNode = get().nodes.find(node => node.id === childId);

              //             if (findParentNode?.text?.length > 1 && findChildNode?.text.length > 1) {
              //               refs = `${findParentNode?.text?.find((ele) => ele[0] === "content_type_uid")?.[1]} -> ${findChildNode?.text?.find((ele) => ele[0] === "content_type_uid")?.[1]}`;
              //             }

              //             const refBlock = {
              //               id: uuidv4(),
              //               text: refs,
              //               width,
              //               height,
              //               isError: Math.random() > 0.5,
              //               color: ["white", "black"],
              //               data: {
              //                 type: "array",
              //                 isParent: true,
              //                 isEmpty: false,
              //                 childrenCount: 1,
              //               },
              //             };

              //             const { width: refWidth, height: refHeight } = calculateNodeSize(refBlock, true);

              //             refBlock.width = refWidth;
              //             refBlock.height = refHeight;

              //             if (!get().nodeMapping.has(`${parentNodeId}_ref`)) {
              //               set({ nodeMapping: new Map([...get().nodeMapping, [`${parentNodeId}_ref`, refBlock.id]]) });
              //               set({ nodes: [...get().nodes, refBlock] });
              //             }

              //             // const edge = {
              //             //   id: `e${parentNodeId}-${childId}`,
              //             //   from: parentNodeId || "",
              //             //   to: childId || ""
              //             // }

              //             const edge1 = {
              //               id: `e${parentNodeId}-${get().nodeMapping.get(`${parentNodeId}_ref`)}`,
              //               from: parentNodeId || "",
              //               to: get().nodeMapping.get(`${parentNodeId}_ref`) || ""
              //             }

              //             if (!get().edges.find(e => e.id === edge1.id)) {
              //               set({ edges: [...get().edges, edge1] });
              //             }

              //             const edge2 = {
              //               id: `e${get().nodeMapping.get(`${parentNodeId}_ref`)}-${childId}`,
              //               from: get().nodeMapping.get(`${parentNodeId}_ref`) || "",
              //               to: childId || ""
              //             }

              //             if (!get().edges.find(e => e.id === edge2.id)) {
              //               set({ edges: [...get().edges, edge2] });
              //             }
              //           }
              //         }
              //       });
              //     }

              //     set({ contentTypeCollection: new Set([...get().contentTypeCollection, item.content_type_uid]) });
              //     set({ localeCollection: new Set([...get().localeCollection, item.locale]) });
              //     if (item.workflow_stage) {
              //       set({ workflowCollection: new Set([...get().workflowCollection, item.workflow_stage]) });
              //     }
              //   });
              // }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          });
        }

        // ignore
        // if (testing) {
        //   // ensuring all the edges are present (circular dependency is maintained)
        //   Array.from(get().parentMapping).forEach((parent: any) => {
        //     const child = parent[0];
        //     const parents = parent[1];
        //     const childUid = child.split("-")[0];

        //     let childId = `${childUid}_base`;

        //     if (child.includes("variant")) {
        //       childId = child;
        //     }

        //     if (get().nodeMapping.has(childId)) {
        //       const childNode = get().nodeMapping.get(childId);
        //       Array.from(parents).forEach((p: any) => {
        //         // there could a case where the variant might have only <= 1 localised so the child entry might be removed so point to variant base
        //         let currVariant = p;

        //         // if the p ends with variant means it is entry based on variant-locale and if is localised > 1 then normal parent else variant-locale base
        //         if (p.endsWith("-variant")) {
        //           let variantArray = p.split("-");
        //           if (localeMap.get(variantArray[variantArray.length - 2])?.locale.size === 1) {
        //             currVariant = `${variantArray[variantArray.length - 2]}_base`;
        //           }
        //         }

        //         let finder = p.split("-")[0];

        //         // since the parent entry is registered as base_variant in the localeMap -> should be optimised
        //         if (finder === decryptedResult.entryUid) {
        //           finder = "base_variant";
        //         }

        //         // when locale entries not present for a locale the edge must come from the parent base
        //         // if locale is 1 or undefined implies no locales
        //         if (!(localeMap.get(finder)?.locale.size > 1) &&
        //           (localeMap.get(finder)?.locale.size === 1 ||
        //             (!p.includes("variant") && !localeMap.has(finder))
        //           )) {
        //           currVariant = `${p.split("-")[0]}_base`;
        //         }

        //         if (get().nodeMapping.has(currVariant)) {
        //           let parentNode = get().nodeMapping.get(currVariant);
        //           let baseParent: any = Array.from(parents).find((p: any) => get().nodeMapping.get(p) === parentNode);

        //           let localeFinder = baseParent?.split("-")[0];
        //           let onlyVariantFinder = false;

        //           // to handle _variant mapped locale
        //           if (!noVariants && baseParent?.endsWith("_variant")) {
        //             if (baseParent.includes("base_variant")) {
        //               localeFinder = "base_variant";
        //             }
        //             else {
        //               localeFinder = baseParent.split("_")[0];
        //             }
        //             onlyVariantFinder = true;
        //           }

        //           if (localeFinder === "base_variant_base") {
        //             localeFinder = decryptedResult.entryUid;
        //           }

        //           if (!onlyVariantFinder && !noVariants && baseParent?.endsWith("-variant")) {
        //             const baseParentArray = baseParent.split("-");
        //             localeFinder = baseParentArray[baseParentArray.length - 2];
        //           }

        //           // if the baseParent's localised entries === 1 make sure that it points to base
        //           if (localeMap.get(localeFinder)?.locale.size === 1) {
        //             // when there are variants present and baseParent ends with -variants with no localisation it means convert baseParent to variant parent not parent entry
        //             // if (!onlyVariantFinder && !noVariants && baseParent?.endsWith("-variant")) {
        //             //   const baseParentArray = baseParent.split("-");
        //             //   localeFinder = baseParentArray[baseParentArray.length - 2];
        //             // }
        //             parentNode = get().nodeMapping.get(!onlyVariantFinder ? `${localeFinder}_base` : `${localeFinder}`);
        //           }

        //           /* get the baseParentNode and baseMasterNode */
        //           const baseParentNode = get().nodes.find((node) => node.id === get().nodeMapping.get(baseParent as string));
        //           const baseMasterNode = get().nodes.find((node) => node.id === get().nodeMapping.get(!onlyVariantFinder ? `${localeFinder}_base` : `${localeFinder}_variant`))

        //           /* If both has same locale it means it is a duplicate locale so ensure to point its references to baseMasterNode */
        //           if (baseParentNode && baseMasterNode && baseParentNode?.text?.find(node => node[0] === "locale")?.[1] === baseMasterNode?.text?.find(node => node[0] === "locale")?.[1]) {
        //             parentNode = baseMasterNode?.id;
        //           }

        //           // const isEdgeRefPresent = get().edges.find(edge => edge.id === `e${parentNode}-${get().nodeMapping.get(`${parentNode}_ref`)}`);
        //           const isRefChildEdgePresent = get().edges.find(edge => edge.id === `e${get().nodeMapping.get(`${parentNode}_ref`)}-${childNode}`);

        //           if (parentNode && !isRefChildEdgePresent) {
        //             // do not add an extra edge for the ones including variant (these are already added)
        //             if (!p.includes("_variant")) {
        //               // add ref block if not present to achieve parent -> ref -> child
        //               let refs = "references";
        //               const findParentNode = get().nodes.find(node => node.id === parentNode);
        //               const findChildNode = get().nodes.find(node => node.id === childNode);

        //               if (findParentNode?.text?.length > 1 && findChildNode?.text.length > 1) {
        //                 refs = `${findParentNode?.text?.find((ele) => ele[0] === "content_type_uid")?.[1]} -> ${findChildNode?.text?.find((ele) => ele[0] === "content_type_uid")?.[1]}`;
        //               }

        //               const refBlock = {
        //                 id: uuidv4(),
        //                 text: refs,
        //                 width: 0,
        //                 height: 0,
        //                 isError: Math.random() > 0.5,
        //                 color: ["white", "black"],
        //                 data: {
        //                   type: "array",
        //                   isParent: true,
        //                   isEmpty: false,
        //                   childrenCount: 1,
        //                 },
        //               };

        //               const { width: refWidth, height: refHeight } = calculateNodeSize(refBlock, true);

        //               refBlock.width = refWidth;
        //               refBlock.height = refHeight;

        //               if (!get().nodeMapping.has(`${parentNode}_ref`)) {
        //                 set({ nodeMapping: new Map([...get().nodeMapping, [`${parentNode}_ref`, refBlock.id]]) });
        //                 set({ nodes: [...get().nodes, refBlock] });
        //               }

        //               const edge1 = {
        //                 id: `e${parentNode}-${get().nodeMapping.get(`${parentNode}_ref`)}`,
        //                 from: parentNode || "",
        //                 to: get().nodeMapping.get(`${parentNode}_ref`) || ""
        //               }

        //               if (!get().edges.find(e => e.id === edge1.id)) {
        //                 set({ edges: [...get().edges, edge1] });
        //               }

        //               const edge2 = {
        //                 id: `e${get().nodeMapping.get(`${parentNode}_ref`)}-${childId}`,
        //                 from: get().nodeMapping.get(`${parentNode}_ref`) || "",
        //                 to: childNode || ""
        //               }

        //               if (!get().edges.find(e => e.id === edge2.id)) {
        //                 set({ edges: [...get().edges, edge2] });
        //               }
        //             }
        //           }
        //         }
        //       });
        //     }
        //   });

        //   // removed the extra localised nodes of master locale
        //   Array.from(nodesToRemove).forEach((localeNode: any) => {
        //     set({ nodes: get().nodes.filter(node => node.id !== localeNode.id), edges: get().edges.filter(edge => edge.from !== localeNode.id && edge.to !== localeNode.id) })
        //   });

        //   // removing extra reduntant ref nodes
        //   Array.from(get().nodeMapping).forEach((node) => {
        //     const refNode = node[0]?.includes("_ref") ? node[1] : null;

        //     if (refNode && !get().edges.find((edge) => edge.to === refNode)) {
        //       // redundant
        //       set({ nodes: get().nodes.filter(node => node.id !== refNode), edges: get().edges.filter(edge => edge.from !== refNode) });
        //     }
        //   });
        // }

        const nodes = get().nodes;
        const edges = get().edges;

        // const { nodes, edges } = parser(data ?? useJson.getState().json, new Map(), get().locale);

        calculateIncomingEdges(edges, get().freqMap);

        // detect cycles to show a warning
        detectCycles(edges, get().setDetectCycles, get);

        // if (get().collapseAll) {
        //   set({ nodes, edges, ...options });
        //   get().collapseGraph();
        // } else {

        //@ts-ignore
        set({
          nodes,
          edges,
          collapsedParents: [],
          collapsedNodes: [],
          collapsedEdges: [],
          graphCollapsed: false,
          ...options,
        });
      } catch (error) {
        console.log(error);
      }
    }
  },
  setDirection: (direction = "RIGHT") => {
    set({ direction });
    setTimeout(() => get().centerView(), 200);
  },
  setLocale: (locale: string) => {
    set({ locale });
    get().resetFreqMap();
    get().setLoading(true);
    get().setGraph(useJson.getState().json);
    get().setLoading(false);
  },
  setDetectCycles: (detection) => set({ detectCycles: detection }),
  setLoading: loading => set({ loading }),
  expandNodes: nodeId => {
    const [childrenNodes, matchingNodes] = getOutgoers(
      nodeId,
      get().nodes,
      get().edges,
      get().collapsedParents,
      get().freqMap,
      true,
      get().collapsedNodes,
      get().collapsedEdges
    );
    const childrenEdges = getChildrenEdges(childrenNodes, get().edges, nodeId, get().freqMap, true);

    const nodesConnectedToParent = childrenEdges.reduce((nodes: string[], edge) => {
      edge.from && !nodes.includes(edge.from) && nodes.push(edge.from);
      edge.to && !nodes.includes(edge.to) && nodes.push(edge.to);
      return nodes;
    }, []);
    const matchingNodesConnectedToParent = matchingNodes.filter(node =>
      nodesConnectedToParent.includes(node)
    );
    const nodeIds = childrenNodes.map(node => node.id).concat(matchingNodesConnectedToParent);
    const edgeIds = childrenEdges.map(edge => edge.id);

    const collapsedParents = get().collapsedParents.filter(cp => cp !== nodeId);
    const collapsedNodes = get().collapsedNodes.filter(nodeId => !nodeIds.includes(nodeId));
    const collapsedEdges = get().collapsedEdges.filter(edgeId => !edgeIds.includes(edgeId));

    set({
      collapsedParents,
      collapsedNodes,
      collapsedEdges,
      graphCollapsed: !!collapsedNodes.length,
    });

  },
  collapseNodes: nodeId => {
    const [childrenNodes] = getOutgoers(nodeId, get().nodes, get().edges, [], get().freqMap, false, get().collapsedNodes, get().collapsedEdges);
    // add another nodeId param
    const childrenEdges = getChildrenEdges(childrenNodes, get().edges, nodeId, get().freqMap);

    const nodeIds = childrenNodes.map(node => node.id);
    const edgeIds = childrenEdges.map(edge => edge.id);

    set({
      collapsedParents: get().collapsedParents.concat(nodeId),
      collapsedNodes: get().collapsedNodes.concat(nodeIds),
      collapsedEdges: get().collapsedEdges.concat(edgeIds),
      graphCollapsed: !!get().collapsedNodes.concat(nodeIds).length,
    });
  },
  collapseGraph: () => {
    const edges = get().edges;
    const tos = edges.map(edge => edge.to);
    const froms = edges.map(edge => edge.from);
    const parentNodesIds = froms.filter(id => !tos.includes(id));
    const secondDegreeNodesIds = edges
      .filter(edge => parentNodesIds.includes(edge.from))
      .map(edge => edge.to);

    const collapsedParents = get()
      .nodes.filter(node => !parentNodesIds.includes(node.id) && node.data?.isParent)
      .map(node => node.id);

    const collapsedNodes = get()
      .nodes.filter(
        node => !parentNodesIds.includes(node.id) && !secondDegreeNodesIds.includes(node.id)
      )
      .map(node => node.id);

    const closestParentToRoot = Math.min(...collapsedParents.map(n => +n));
    const focusNodeId = `g[id*='node-${closestParentToRoot}']`;
    const rootNode = document.querySelector(focusNodeId);

    set({
      collapsedParents,
      collapsedNodes,
      collapsedEdges: get()
        .edges.filter(edge => !parentNodesIds.includes(edge.from))
        .map(edge => edge.id),
      graphCollapsed: true,
    });

    if (rootNode) {
      get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
        elementExtraMarginForZoom: 300,
      });
    }
  },
  expandGraph: () => {
    set({
      collapsedNodes: [],
      collapsedEdges: [],
      collapsedParents: [],
      graphCollapsed: false,
    });

    // Call validateHiddenNodes after state update
    setTimeout(() => {
      validateHiddenNodes(get().collapsedNodes, get().collapsedEdges);
    }, 0);
  },
  focusFirstNode: () => {
    const rootNode = document.querySelector("g[id*='node-1']");
    get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
      elementExtraMarginForZoom: 100,
    });
  },
  setZoomFactor: zoomFactor => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, zoomFactor);
  },
  zoomIn: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor + 0.1);
  },
  zoomOut: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor - 0.1);
  },
  centerView: () => {
    const viewPort = get().viewPort;
    viewPort?.updateContainerSize();

    const canvas = document.querySelector(".jsoncrack-canvas") as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },
  toggleFullscreen: fullscreen => set({ fullscreen }),
  setViewPort: viewPort => set({ viewPort }),
  setHighlightedPaths: (paths, nodes, nodeId) => {
    if (nodeId === get().currNode) {
      set({ highlighedPaths: new Set([]), highlightedNodes: new Set([]), currNode: "" });
    }
    else {
      set({ highlighedPaths: new Set([...paths]), highlightedNodes: new Set([...nodes]), currNode: nodeId });
    }
  },
  setFilterVisibility: (filter: string, filterType: string) => {
    const [highlightedNodes] = getLocaleNodes(get().nodes, filter, get().nodeMapping, filterType);

    set({
      highlightedNodes: (!filter || filter === "all" || filter === "") ? new Set([]) : highlightedNodes.length === 0 ? new Set([...get().nodes]) : new Set([...highlightedNodes]),
      highlighedPaths: new Set([])
    });
  },
  setFilter: (type: string, filter: string) => {
    // if reset is clicked no type and no filter
    if (!type) {
      set({ filter: null })
    }
    // type and filter
    else {
      const filterObject = {
        "content-type": "",
        "locale": "",
        "workflow": "",
      };

      set({
        filter: {
          ...filterObject,
          [type]: filter
        }
      });
    }
  }
}));

export default useGraph;