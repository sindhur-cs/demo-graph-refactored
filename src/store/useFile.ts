import debounce from "lodash.debounce";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import { create } from "zustand";
import { FileFormat } from "src/enums/file.enum";
import { isIframe } from "src/lib/utils/helpers";
import { contentToJson, jsonToContent } from "src/lib/utils/jsonAdapter";
import useGraph from "../containers/Editor/components/views/GraphView/stores/useGraph";
import useConfig from "./useConfig";
import useJson from "./useJson";

const defaultJson = JSON.stringify(
  [
    {
      "entry_uid": "00001-en",
      "name": "Homepage",
      "variant": "Base Entry",
      "version": "1.0",
      "locale": "en-US",
      "publishLocale": "en-US",
      "content_type_uid": "Homepage",
      "workflowStage": "Ready to Publish",
      "link": "/entries/homepage-customer-b",
      "publishableStatus": "Yes",
      "references": [
        {
          "entry_uid": "00201-en",
          "name": "How to write a blog",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "link": "/entries/innovative-web-solutions",
          "publishableStatus": "Yes",
          "references": [
            {
              "entry_uid": "00301-en",
              "name": "Alice B",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/alice-brown",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "00401-en",
                  "name": "New Innovations Inc",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/tech-innovations",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "501-en",
                      "name": "Canada",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/canada",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "00202-en",
          "name": "Past of Technology",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "In Review",
          "publishableStatus": "No",
          "link": "/entries/future-of-technology",
          "references": [
            {
              "entry_uid": "302-en",
              "name": "Bob Smith",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/bob-smith",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "402-en",
                  "name": "Global Tech Corp",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/global-tech-corp",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "502-en",
                      "name": "Germany",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/germany",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "00203-en",
          "name": "Tech Trends 2024",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "publishableStatus": "Yes",
          "link": "/entries/tech-trends-2025",
          "references": [
            {
              "entry_uid": "303-en",
              "name": "Charlie Johnson",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/charlie-johnson",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "403-en",
                  "name": "Innovatech LLC",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/innovatech",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "503-en",
                      "name": "Australia",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/australia",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "entry_uid": "0000-en",
      "name": "Homepage for Business Audience",
      "variant": "Business Audience",
      "version": "1.0",
      "locale": "en-US",
      "publishLocale": "en-US",
      "content_type_uid": "Homepage",
      "workflowStage": "Ready to Publish",
      "link": "/entries/homepage",
      "publishableStatus": "Yes",
      "references": [
        {
          "entry_uid": "1-en",
          "name": "How to Build a Modern Web App",
          "version": "2.1",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "link": "/entries/1",
          "publishableStatus": "Already Published",
          "references": [
            {
              "entry_uid": "2-en",
              "name": "John Smith",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/2",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "3-en",
                  "name": "TechCorp Inc",
                  "version": "3.2",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/3",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "4-en",
                      "name": "United States",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "6-en",
          "name": "The Future of AI",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "In Review",
          "publishableStatus": "No",
          "link": "/entries/6",
          "references": [
            {
              "entry_uid": "7-en",
              "name": "Sarah Johnson",
              "version": "2.1",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/7",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "8-en",
                  "name": "AI Research Lab",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/8",
                  "publishableStatus": "Yes",
                  "references": [
                    {
                      "entry_uid": "4-en",
                      "name": "United States",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "9-en",
          "name": "Global Tech Trends 2024",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "publishableStatus": "Already Published",
          "link": "/entries/9",
          "references": [
            {
              "entry_uid": "2-en",
              "name": "John Smith",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/2",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "3-en",
                  "name": "TechCorp Inc",
                  "version": "3.2",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/3",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "4-en",
                      "name": "United States",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "entry_uid": "0000-fr",
      "name": "Fr Homepage for Business Audience",
      "variant": "Business Audience",
      "version": "1.0",
      "locale": "fr-FR",
      "publishLocale": "fr-FR",
      "content_type_uid": "Homepage",
      "workflowStage": "Ready to Publish",
      "link": "/entries/homepage",
      "publishableStatus": "Yes",
      "references": [
        {
          "entry_uid": "1-fr",
          "name": "Comment construire une application web moderne",
          "version": "2.1",
          "locale": "fr-FR",
          "publishLocale": "fr-FR",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "link": "/entries/1-fr",
          "publishableStatus": "Yes",
          "references": [
            {
              "entry_uid": "12-fr",
              "name": "Jonus Smithen",
              "version": "1.0",
              "locale": "fr-FR",
              "publishLocale": "fr-FR",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/2",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "13-fr",
                  "name": "TechCorp French Inc",
                  "version": "3.2",
                  "locale": "fr-FR",
                  "publishLocale": "fr-FR",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/3",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "14-fr",
                      "name": "France",
                      "version": "1.0",
                      "locale": "fr-FR",
                      "publishLocale": "fr-FR",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "6-fr",
          "name": "The Future of AI",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "fr-FR",
          "content_type_uid": "Blog Post",
          "workflowStage": "In Review",
          "publishableStatus": "No",
          "link": "/entries/6",
          "references": [
            {
              "entry_uid": "7-fr",
              "name": "Sarah Johnson",
              "version": "2.1",
              "locale": "en-US",
              "publishLocale": "fr-FR",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/7",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "8-fr",
                  "name": "AI Research Lab",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "fr-FR",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/8",
                  "publishableStatus": "Yes",
                  "references": [
                    {
                      "entry_uid": "4-fr",
                      "name": "United States",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "fr-FR",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "9-fr",
          "name": "Global Tech Trends 2024",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "fr-FR",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "publishableStatus": "Already Published",
          "link": "/entries/9",
          "references": [
            {
              "entry_uid": "2-fr",
              "name": "John Smith",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "fr-FR",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/2",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "3-fr",
                  "name": "TechCorp Inc",
                  "version": "3.2",
                  "locale": "en-US",
                  "publishLocale": "fr-FR",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/3",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "4-fr",
                      "name": "United States",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "fr-FR",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "entry_uid": "0000-es",
      "name": "ES Homepage for Business Audience",
      "variant": "Business Audience",
      "version": "1.0",
      "locale": "es-ES",
      "publishLocale": "es-ES",
      "content_type_uid": "Homepage",
      "workflowStage": "Ready to Publish",
      "link": "/entries/homepage",
      "publishableStatus": "Yes",
      "references": [
        {
          "entry_uid": "1-es",
          "name": "Cómo construir una aplicación web moderna",
          "version": "2.1",
          "locale": "es-ES",
          "publishLocale": "es-ES",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "link": "/entries/1-es",
          "publishableStatus": "No",
          "references": [
            {
              "entry_uid": "2-es",
              "name": "John Smith",
              "version": "1.0",
              "locale": "es-ES",
              "publishLocale": "es-ES",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/2",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "3-es",
                  "name": "TechCorp Inc",
                  "version": "3.2",
                  "locale": "es-ES",
                  "publishLocale": "es-ES",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/3",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "4-es",
                      "name": "España",
                      "version": "1.0",
                      "locale": "es-ES",
                      "publishLocale": "es-ES",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/4",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "entry_uid": "0001-en",
      "name": "Homepage for techies",
      "variant": "Technology enthusiasts",
      "version": "1.0",
      "locale": "en-US",
      "publishLocale": "en-US",
      "content_type_uid": "Homepage",
      "workflowStage": "Ready to Publish",
      "link": "/entries/homepage-customer-b",
      "publishableStatus": "Yes",
      "references": [
        {
          "entry_uid": "201-en",
          "name": "Innovative Web Solutions",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "link": "/entries/innovative-web-solutions",
          "publishableStatus": "Yes",
          "references": [
            {
              "entry_uid": "301-en",
              "name": "Alice Brown",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/alice-brown",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "401-en",
                  "name": "Tech Innovations Inc",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/tech-innovations",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "501-en",
                      "name": "Canada",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/canada",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "202-en",
          "name": "Future of Technology",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "In Review",
          "publishableStatus": "No",
          "link": "/entries/future-of-technology",
          "references": [
            {
              "entry_uid": "302-en",
              "name": "Bob Smith",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/bob-smith",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "402-en",
                  "name": "Global Tech Corp",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/global-tech-corp",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "502-en",
                      "name": "Germany",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/germany",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "entry_uid": "203-en",
          "name": "Tech Trends 2025",
          "version": "1.0",
          "locale": "en-US",
          "publishLocale": "en-US",
          "content_type_uid": "Blog Post",
          "workflowStage": "Published",
          "publishableStatus": "Yes",
          "link": "/entries/tech-trends-2025",
          "references": [
            {
              "entry_uid": "303-en",
              "name": "Charlie Johnson",
              "version": "1.0",
              "locale": "en-US",
              "publishLocale": "en-US",
              "content_type_uid": "Author",
              "workflowStage": "Published",
              "link": "/entries/charlie-johnson",
              "publishableStatus": "Yes",
              "references": [
                {
                  "entry_uid": "403-en",
                  "name": "Innovatech LLC",
                  "version": "1.0",
                  "locale": "en-US",
                  "publishLocale": "en-US",
                  "content_type_uid": "Company",
                  "workflowStage": "Published",
                  "link": "/entries/innovatech",
                  "publishableStatus": "No",
                  "references": [
                    {
                      "entry_uid": "503-en",
                      "name": "Australia",
                      "version": "1.0",
                      "locale": "en-US",
                      "publishLocale": "en-US",
                      "content_type_uid": "Country",
                      "workflowStage": "Published",
                      "link": "/entries/australia",
                      "publishableStatus": "Already Published"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  null,
  2
);

type SetContents = {
  contents?: string;
  hasChanges?: boolean;
  skipUpdate?: boolean;
  format?: FileFormat;
};

type Query = string | string[] | undefined;

interface JsonActions {
  getContents: () => string;
  getFormat: () => FileFormat;
  getHasChanges: () => boolean;
  setError: (error: string | null) => void;
  setHasChanges: (hasChanges: boolean) => void;
  setContents: (data: SetContents) => void;
  fetchUrl: (url: string) => void;
  setFormat: (format: FileFormat) => void;
  clear: () => void;
  setFile: (fileData: File) => void;
  setJsonSchema: (jsonSchema: object | null) => void;
  checkEditorSession: (url: Query, widget?: boolean) => void;
}

export type File = {
  id: string;
  views: number;
  owner_email: string;
  name: string;
  content: string;
  private: boolean;
  format: FileFormat;
  created_at: string;
  updated_at: string;
};

const initialStates = {
  fileData: null as File | null,
  format: FileFormat.JSON,
  contents: defaultJson,
  error: null as any,
  hasChanges: false,
  jsonSchema: null as object | null,
};

export type FileStates = typeof initialStates;

const isURL = (value: string) => {
  return /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi.test(
    value
  );
};

const debouncedUpdateJson = debounce((value: unknown) => {
  useGraph.getState().setLoading(true);
  useJson.getState().setJson(JSON.stringify(value, null, 2));
}, 800);

const useFile = create<FileStates & JsonActions>()((set, get) => ({
  ...initialStates,
  clear: () => {
    set({ contents: "" });
    useJson.getState().clear();
  },
  setJsonSchema: jsonSchema => set({ jsonSchema }),
  setFile: fileData => {
    set({ fileData, format: fileData.format || FileFormat.JSON });
    get().setContents({ contents: fileData.content, hasChanges: false });
    gaEvent("set_content", { label: fileData.format });
  },
  getContents: () => get().contents,
  getFormat: () => get().format,
  getHasChanges: () => get().hasChanges,
  setFormat: async format => {
    try {
      const prevFormat = get().format;

      set({ format });
      const contentJson = await contentToJson(get().contents, prevFormat);
      const jsonContent = await jsonToContent(JSON.stringify(contentJson, null, 2), format);

      get().setContents({ contents: jsonContent });
    } catch (error) {
      get().clear();
      console.warn("The content was unable to be converted, so it was cleared instead.");
    }
  },
  setContents: async ({ contents, hasChanges = true, skipUpdate = false, format }) => {
    try {
      set({
        ...(contents && { contents }),
        error: null,
        hasChanges,
        format: format ?? get().format,
      });

      const isFetchURL = window.location.href.includes("?");
      const json = await contentToJson(get().contents, get().format);

      if (!useConfig.getState().liveTransformEnabled && skipUpdate) return;

      if (get().hasChanges && contents && contents.length < 80_000 && !isIframe() && !isFetchURL) {
        sessionStorage.setItem("content", contents);
        sessionStorage.setItem("format", get().format);
        set({ hasChanges: true });
      }

      debouncedUpdateJson(json);
    } catch (error: any) {
      if (error?.mark?.snippet) return set({ error: error.mark.snippet });
      if (error?.message) set({ error: error.message });
      useJson.setState({ loading: false });
      useGraph.setState({ loading: false });
    }
  },
  setError: error => set({ error }),
  setHasChanges: hasChanges => set({ hasChanges }),
  fetchUrl: async url => {
    try {
      const res = await fetch(url);
      const json = await res.json();
      const jsonStr = JSON.stringify(json, null, 2);

      get().setContents({ contents: jsonStr });
      return useJson.setState({ json: jsonStr, loading: false });
    } catch (error) {
      get().clear();
      toast.error("Failed to fetch document from URL!");
    }
  },
  checkEditorSession: (url, widget) => {
    if (url && typeof url === "string") {
      if (isURL(url)) return get().fetchUrl(url);
    }

    let contents = defaultJson;
    const sessionContent = sessionStorage.getItem("content") as string | null;
    const format = sessionStorage.getItem("format") as FileFormat | null;
    if (sessionContent && !widget) contents = sessionContent;

    if (format) set({ format });
    get().setContents({ contents, hasChanges: false });
  },
}));

export default useFile;
