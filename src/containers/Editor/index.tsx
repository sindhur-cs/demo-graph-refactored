import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styled from "styled-components";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import useGraph from "src/containers/Editor/components/views/GraphView/stores/useGraph";
import { FullscreenDropzone } from "./components/FullscreenDropzone";
import Sidebar from "../Sidebar";
import { Code, TriangleAlert } from "lucide-react";
import Filter from "./components/Filter";
import useJsonEditor from "src/store/useJsonEditor";
import useToggleStatusIcon from "src/store/useToggleStatusIcon";
import Select from "./components/Select";
import FilterItem from "./components/FilterItem";

export const StyledEditor = styled(Allotment)`
  position: relative !important;
  display: flex;
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
  height: 100vh;
`;

const TextEditor = dynamic(() => import("src/containers/Editor/components/TextEditor"), {
  ssr: false,
});

const LiveEditor = dynamic(() => import("src/containers/Editor/components/LiveEditor"), {
  ssr: false,
});

export const Editor = () => {
  const { contentTypeCollection, fullscreen, localeCollection, filter, workflowCollection, setFilterVisibility } = useGraph();
  const { onOpen, isOpen } = useJsonEditor();
  const { open, setToggle } = useToggleStatusIcon();
  const { detectCycles } = useGraph();
  const [showTooltip, setShowTooltip] = useState(false);
  const [currFilterCollections, setCurrFilterCollections] = useState<Set<string>>(new Set([]));
  const [type, setType] = useState("");
  const [isClicked, setIsClicked] = useState("");
  const [options, setOptions] = useState([{ value: "locale", label: "Locale", type: "locale" }, { value: "content-type", label: "Content Type", type: "content-type" }, { value: "workflow", label: "Workflow Stage", type: "workflow"}]);

  useEffect(() => {
    if(filter) {
      const collection = filter["content-type"] ? contentTypeCollection : filter.locale ? localeCollection : filter.workflow ? workflowCollection : new Set([]);
      const type = filter["content-type"] ? "content-type" : filter.locale ? "locale" : filter.workflow ? "workflow" : new Set([]);
      setType(type as string);
      setIsClicked(filter["content-type"] || filter.locale || filter.workflow);
      setCurrFilterCollections(collection);

      // lets swap so that the user sees the chosen filter first
      const firstOption = options[0];
      const chosenOption = options.find((option: { value: string, label: string, type: string }) => option.type === type);
      const chosenOptionIndex = options.indexOf(chosenOption as { value: string, label: string, type: string });

      if(chosenOptionIndex >= 0 && chosenOptionIndex < options.length) {
        const newOptions = options;
        newOptions[0] = chosenOption as { value: string, label: string, type: string };
        newOptions[chosenOptionIndex] = firstOption;
        setOptions(newOptions);
      }
    }
    else {
      // when reset clicked
      setIsClicked("");
      setCurrFilterCollections(new Set([]));
      setType("");
      setFilterVisibility("", "");
    }
  }, [filter]);

  const handleJsonEditor = () => {
    onOpen();
  }

  return (
    <>
        <div className="flex gap-4 items-center absolute top-10 z-10 justify-between w-full px-10">
          <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <button className="h-8 w-20 p-6 py-4 text-xs rounded-3xl text-white bg-[#7C4DFF] mr-3 flex items-center justify-center cursor-pointer" onClick={() => setToggle()}>{open ? "Close" : "Validate"}</button>
          </div>
            {detectCycles && 
              <div className="flex justify-center gap-2 items-center">
                <TriangleAlert className="text-yellow-500 h-6 w-6 cursor-pointer"/>
                <div className="relative h-8 p-6 py-4 text-xs rounded-3xl text-white bg-yellow-500 flex items-center justify-center outline-none select-none">
                  Cycle has been detected in the graph
                </div>
              </div>
            }
          </div>
          <div className="flex items-center gap-2">
            <Filter options={options} />
          </div>
        </div>
      <StyledEditor proportionalLayout={false}>
        {isOpen && <Allotment.Pane
          preferredSize={450}
          minSize={fullscreen ? 0 : 300}
          maxSize={800}
          visible={!fullscreen}
        >
          <TextEditor />
        </Allotment.Pane>}
        <Allotment.Pane minSize={0} className="h-full">
          <LiveEditor />
          <Sidebar/>
        </Allotment.Pane>
      </StyledEditor>
      <FullscreenDropzone />
    </>
  );
};
