import React from "react";
import { CheckCircle2, AlertTriangle, X, Link } from "lucide-react";
import useClose from "src/store/useClose";
import Checkbox from "../Checkbox";

interface EntryCardProps {
  title: string;
  language: string;
  hasErrors: boolean;
}

const HeaderTextWrapper = ({children, space}: {children?: React.ReactNode, space?: string}) => {
  return (
    <div className={`flex items-center text-wrap ${space} mx-4 my-5`}>{children}</div>
  )
}

const Header = () => {
  return (
    <>
      <HeaderTextWrapper space="col-span-6 gap-4">
        <Checkbox/> <span>Title</span>
      </HeaderTextWrapper>
      <HeaderTextWrapper space="col-span-2 justify-center">Publishable</HeaderTextWrapper>
      <HeaderTextWrapper space="col-span-2 justify-center">Content Type</HeaderTextWrapper>
      <HeaderTextWrapper space="col-span-2 justify-center"></HeaderTextWrapper>
    </>
  )
}

const EntryCard = ({ title, language, hasErrors }: EntryCardProps) => {
  return (
    <div className="grid grid-cols-12 bg-white shadow-md rounded-lg p-4 mb-4 hover:bg-gray-50 transition-colors duration-200 z-50">
        <div className="flex items-center gap-4 col-span-6">
          <Checkbox/>
          <div className="flex flex-col items-start justify-center">
            <span className="font-semibold text-gray-800">{title}</span>
            <span className="text-sm text-gray-500">{language}</span> 
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-center mx-4">
          {hasErrors ? (
            <AlertTriangle className="text-red-500 w-6 h-6" />
          ) : (
            <CheckCircle2 className="text-green-500 w-6 h-6" />
          )}
        </div>
        <div className="col-span-2 flex items-center justify-center mx-4 ml-6">
          <span>something</span>
        </div>
        <div className="col-span-2 flex items-center justify-center">
          <Link className="h-5 w-5 text-gray-600"/>
        </div>
    </div>
  );
};

const Sidebar = () => {
  const languages = [
    { title: "Something", language: "English", hasErrors: false },
    { title: "Something", language: "French", hasErrors: true },
    { title: "Something", language: "Spanish", hasErrors: false }
  ];
  const { isOpen, onClose } = useClose();

  const handleClose = () => {
    onClose();
  };

  return (
    <>
    <div className={`absolute top-0 right-0 min-w-96 z-50 bg-white border-r border-gray-200 h-full p-6 overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"} transition-transform duration-300`}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Entry Validator</h1>
          <X className="w-6 h-6 text-gray-500 cursor-pointer" onClick={handleClose}/>
        </div>
        <p className="text-sm text-gray-500">
          Monitor the error status of your project's entries at a glance
        </p>
      </div>
      
      <div>
      <h2 className="text-xl font-bold text-gray-800">Entry</h2>
        <div className="grid grid-cols-12">
          <Header/>
        </div>
        {languages.map((lang, index) => (
          <EntryCard 
            key={index} 
            title={lang.title}
            language={lang.language} 
            hasErrors={lang.hasErrors} 
          />
        ))}
      </div>
      </div>
    </>
  );
};

export default Sidebar;