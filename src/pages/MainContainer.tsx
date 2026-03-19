import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import AgreementData from "../editors/editorsContainer/AgreementData";
import TemplateModel from "../editors/editorsContainer/TemplateModel";
import TemplateMarkdown from "../editors/editorsContainer/TemplateMarkdown";
import useAppStore from "../store/store";
import { AIChatPanel } from "../components/AIChatPanel";
import ProblemPanel from "../components/ProblemPanel";
import SampleDropdown from "../components/SampleDropdown";
import { useState, useRef, useEffect } from "react";
import { TemplateMarkdownToolbar } from "../components/TemplateMarkdownToolbar";
import { MarkdownEditorProvider } from "../contexts/MarkdownEditorContext";
import "../styles/pages/MainContainer.css";
import html2pdf from "html2pdf.js";
import { Button, message } from "antd";
import * as monaco from "monaco-editor";
import { MdFormatAlignLeft, MdChevronRight, MdExpandMore, MdClose  } from "react-icons/md";
import DOMPurify from "dompurify";
import Editor from "@monaco-editor/react";

const MainContainer = () => {
  const agreementHtml = useAppStore((state) => state.agreementHtml);
  const downloadRef = useRef<HTMLDivElement>(null);
  const jsonEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const backgroundColor = useAppStore((state) => state.backgroundColor);
  const textColor = useAppStore((state) => state.textColor);

  const handleDownloadPdf = async () => {
    const element = downloadRef.current;
    if (!element) return;

    try {
      setIsDownloading(true);
      const options = {
        margin: 10,
        filename: 'agreement.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as const;

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
      void message.error("Failed to generate PDF. Please check the console.");
    } finally {
      setIsDownloading(false);
    }
  }

  const handleJsonFormat = () => {
    if (jsonEditorRef.current) {
      void jsonEditorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const {
    isAIChatOpen,
    isEditorsVisible,
    isPreviewVisible,
    isProblemPanelVisible,
    isModelCollapsed,
    isTemplateCollapsed,
    isDataCollapsed,
    toggleTemplateCollapse,
    toggleProblemPanel,
    toggleModelCollapse,
    toggleDataCollapse,
  } = useAppStore((state) => ({
    isAIChatOpen: state.isAIChatOpen,
    isEditorsVisible: state.isEditorsVisible,
    isPreviewVisible: state.isPreviewVisible,
    isProblemPanelVisible: state.isProblemPanelVisible,
    isModelCollapsed: state.isModelCollapsed,
    isTemplateCollapsed: state.isTemplateCollapsed,
    isDataCollapsed: state.isDataCollapsed,
    toggleModelCollapse: state.toggleModelCollapse,
    toggleDataCollapse: state.toggleDataCollapse,
    toggleTemplateCollapse: state.toggleTemplateCollapse,
    toggleProblemPanel: state.toggleProblemPanel,
  }));

  const [, setLoading] = useState(true);
  const [request, setRequest] = useState(`{
    "input": 100}`);

  const [executionResult, setExecutionResult] = useState<any>(null);
  const [logicCode, setLogicCode] = useState(`// Write contract logic here
  export default class Logic {
  async trigger(data, request) {
  return {
    result: {
      message: "Hello from logic!"
      }
    };
  }
}`);

  // Calculate dynamic panel sizes based on collapse states
  const collapsedCount = [isModelCollapsed, isTemplateCollapsed, isDataCollapsed].filter(Boolean).length;
  const expandedCount = 3 - collapsedCount;
  const collapsedSize = 5;
  const expandedSize = expandedCount > 0 ? (100 - (collapsedCount * collapsedSize)) / expandedCount : 33;
  
  // Create distinct preview background for better visual separation
  const previewBackgroundColor = backgroundColor === '#ffffff' 
    ? '#f0f9ff'  // Cool light blue for preview - modern and distinct
    : '#1a1f2e';  // Distinct darker blue-tinted background for preview in dark mode
  
  const previewHeaderColor = backgroundColor === '#ffffff'
    ? '#dbeafe'  // Slightly darker blue for header in light mode
    : '#0f172a';  // Even darker shade for header in dark mode
  
  // Create a key that changes when collapse state changes to force panel re-layout
  const panelKey = `${String(isModelCollapsed)}-${String(isTemplateCollapsed)}-${String(isDataCollapsed)}`;
  const data = useAppStore((state) => state.data);
  const model = useAppStore((state) => state.model);
  const template = useAppStore((state) => state.template);
    
  const runContract = async () => {
  console.log("RUN CLICKED");

  let parsedRequest;

  try {
    parsedRequest = JSON.parse(request);
  } catch (err) {
    console.error("JSON ERROR:", err);
    setExecutionResult({ error: "Invalid JSON in request" });
    return;
  }

  let parsedData;

  try {
    parsedData = typeof data === "string" ? JSON.parse(data) : data;
  } catch (err) {
    console.error("DATA JSON ERROR:", err);
    setExecutionResult({ error: "Invalid JSON in data" });
    return;
  }

  try {
    console.log("Sending request...");

    const res = await fetch("http://localhost:3001/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        template,
        logic: logicCode,
        data: parsedData,
        request: parsedRequest,
      }),
    });

    console.log("Response status:", res.status);

    const result = await res.json();
    console.log("RESULT:", result);

    if (!res.ok) {
      throw new Error(result.error || "Execution failed");
    }

    setExecutionResult(result);

  } catch (err: any) {
    console.error("FULL ERROR:", err);
    setExecutionResult({
      error: err.message || "Execution failed",
    });
  }
};

    const requestEditorRef = useRef<any>(null);

    <Editor
      onMount={(editor) => {
        requestEditorRef.current = editor;
      }}
    />
    useEffect(() => {
      setTimeout(() => {
        requestEditorRef.current?.layout();
      }, 100);
    }, [isDataCollapsed, isModelCollapsed, isTemplateCollapsed]);

  return (
    <div className="main-container" style={{ backgroundColor }}>
      <PanelGroup direction="horizontal" className="main-container-panel-group"
        style={{ position: "fixed", width: "calc(100% - 64px)", height: "calc(100% - 64px)" }}>
        {isEditorsVisible && (
          <>
            <Panel defaultSize={62.5} minSize={30}>
              <div className="main-container-editors-panel" style={{ backgroundColor }}>
                <PanelGroup key={panelKey} direction="vertical" className="main-container-editors-panel-group">
                  <Panel minSize={3} maxSize={isModelCollapsed ? collapsedSize : 100} defaultSize={isModelCollapsed ? collapsedSize : expandedSize}>
                    <div className="main-container-editor-section tour-concerto-model">
                      <div className={`main-container-editor-header ${backgroundColor === '#ffffff' ? 'main-container-editor-header-light' : 'main-container-editor-header-dark'}`}>
                        {/* Left side */}
                        <div className="main-container-editor-header-left">
                          <button
                            className="collapse-button"
                            onClick={toggleModelCollapse}
                            style={{
                              color: textColor,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                              marginRight: '4px'
                            }}
                            title={isModelCollapsed ? "Expand" : "Collapse"}
                          >
                            {isModelCollapsed ? <MdChevronRight size={20} /> : <MdExpandMore size={20} />}
                          </button>
                          <span>Concerto Model</span>
                          <SampleDropdown setLoading={setLoading} />
                        </div>
                      </div>
                      {!isModelCollapsed && (
                        <div className="main-container-editor-content" style={{ backgroundColor }}>
                          <TemplateModel />
                        </div>
                      )}
                    </div>
                  </Panel>
                  <PanelResizeHandle className="main-container-panel-resize-handle-vertical" />

                  <Panel minSize={20}>
                    <MarkdownEditorProvider>
                      <div className="main-container-editor-section tour-template-mark">
                        <div className={`main-container-editor-header ${backgroundColor === '#ffffff' ? 'main-container-editor-header-light' : 'main-container-editor-header-dark'}`}>
                          
                          <span>TemplateMark</span>
                          <TemplateMarkdownToolbar />
                        </div>
                        <div className="main-container-editor-content" style={{ backgroundColor }}>
                          <TemplateMarkdown />
                        </div>
                      </div>
                    </MarkdownEditorProvider>
                  </Panel>

                  <PanelResizeHandle className="main-container-panel-resize-handle-vertical" />

                  <Panel minSize={15}>
                    <div className="main-container-editor-section">
                      <div className={`main-container-editor-header ${backgroundColor === '#ffffff' ? 'main-container-editor-header-light' : 'main-container-editor-header-dark'}`}>
                        <span>Logic (TypeScript)</span>
                      </div>

                      <div className="main-container-editor-content" style={{ backgroundColor }}>
                        <Editor
                        height="100%"
                        defaultLanguage="typescript"
                        value={logicCode}
                        onChange={(value) => setLogicCode(value || "")}
                      />
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="main-container-panel-resize-handle-vertical" />

                   <Panel minSize={10}>
                    <div className="main-container-editor-section">
                      <div className={`main-container-editor-header ${backgroundColor === '#ffffff' ? 'main-container-editor-header-light' : 'main-container-editor-header-dark'}`}>
                        <span>Request Input</span>
                      </div>

                      <div className="main-container-editor-content">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          value={request}
                          onMount={(editor) => {
                            requestEditorRef.current = editor;
                          }}
                          onChange={(value) => setRequest(value || "")}
                        />
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="main-container-panel-resize-handle-vertical" />


                  <Panel minSize={3} maxSize={isDataCollapsed ? collapsedSize : 100} defaultSize={isDataCollapsed ? collapsedSize : expandedSize}>
                    <div className="main-container-editor-section tour-json-data">
                      <div className={`main-container-editor-header ${backgroundColor === '#ffffff' ? 'main-container-editor-header-light' : 'main-container-editor-header-dark'}`}>
                        <div className="main-container-editor-header-left">
                          <button
                            className="collapse-button"
                            onClick={toggleDataCollapse}
                            style={{
                              color: textColor,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                              marginRight: '4px'
                            }}
                            title={isDataCollapsed ? "Expand" : "Collapse"}
                          >
                            {isDataCollapsed ? <MdChevronRight size={20} /> : <MdExpandMore size={20} />}
                          </button>
                          <span>JSON Data</span>
                        </div>
                        <button
                          onClick={handleJsonFormat}
                          className="px-1 pt-1 border-gray-300 bg-white hover:bg-gray-200 rounded shadow-md"
                          disabled={!jsonEditorRef.current || isDataCollapsed}
                          title="Format JSON"
                        >
                          <MdFormatAlignLeft size={16} />
                        </button>
                      </div>
                      {!isDataCollapsed && (
                        <div className="main-container-editor-content" style={{ backgroundColor }}>
                          <AgreementData editorRef={jsonEditorRef} />
                        </div>
                      )}
                    </div>
                  </Panel>
               
                      <PanelResizeHandle className="main-container-panel-resize-handle-vertical" />
                      {isProblemPanelVisible &&
                       <Panel minSize={3} maxSize={isDataCollapsed ? collapsedSize : 100} defaultSize={isDataCollapsed ? collapsedSize : expandedSize}>
                    <div className="main-container-editor-section tour-json-data">
                      <div className={`main-container-editor-header ${backgroundColor === '#ffffff' ? 'main-container-editor-header-light' : 'main-container-editor-header-dark'}`}>
                        <div className="main-container-editor-header-left">
                          <button
                            className="collapse-button"
                            onClick={toggleProblemPanel}
                            style={{
                              color: textColor,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                              marginRight: '4px'
                            }}
                            title={isProblemPanelVisible ? "Expand" : "Collapse"}
                          >
                            <MdClose size={20} /> 
                          </button>
                          <span>Problems</span>
                        </div>
                      </div>
                      {isProblemPanelVisible &&
                     (<ProblemPanel /> )
                    }
                    </div>
                  </Panel>
}
                </PanelGroup>
              </div>
            </Panel>
            <PanelResizeHandle className="main-container-panel-resize-handle-horizontal" />
          </>
        )}
        {isPreviewVisible && (
          <>
            <Panel className="h-full" defaultSize={37.5} minSize={40}>
              <div className="main-container-preview-panel tour-preview-panel" style={{ backgroundColor: previewBackgroundColor }}>
                <div className={`main-container-preview-header ${backgroundColor === '#ffffff' ? 'main-container-preview-header-light' : 'main-container-preview-header-dark'}`} style={{ backgroundColor: previewHeaderColor }}>
                  <span>Preview</span>
                  <Button
                  onClick={runContract}
                  style={{ marginLeft: "10px" }}>
                  Run Contract
                </Button>
                  <Button
                    onClick={() => void handleDownloadPdf()}
                    loading={isDownloading}
                    style={{ marginLeft: "10px" }}
                  >
                    Download PDF
                  </Button>
                </div>
                <div className="main-container-preview-content" style={{ backgroundColor: previewBackgroundColor }}>
                  <div className="main-container-preview-text">
                    <div
                      ref={downloadRef}
                      className="main-container-agreement"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(agreementHtml) }}
                      style={{
                        color: textColor,
                        backgroundColor: previewBackgroundColor,
                        padding: "20px"
                      }}
                    />
                  </div>
                </div>

           {executionResult && (
            <div className="mt-4 bg-black text-blue-200 rounded-lg shadow-lg border border-gray-700 flex flex-col max-h-60">
              
              <div className="px-4 bg-[#40475c]">
                  <h3 className="text-sm font-semibold">Execution Output</h3>
              </div>

              <div className="p-4 overflow-y-auto text-sm">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(executionResult, null, 2)}
                </pre>
              </div>

            </div>
          )}
        
        </div>
      </Panel>
        </>
      )}
        {isAIChatOpen && (
          <>
            <Panel defaultSize={30} minSize={20}>
              <AIChatPanel />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default MainContainer;
