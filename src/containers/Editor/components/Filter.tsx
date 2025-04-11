import { MdArrowDropDown } from "react-icons/md";
import { useEffect, useState } from "react";
import useGraph from "./views/GraphView/stores/useGraph";
import FilterItem from "./FilterItem";

const Filter = ({ options }: { options: { value: string, label: string, type: string }[] }) => {
    const [open, setOpen] = useState(false);
    const { localeCollection, contentTypeCollection, workflowCollection, filter } = useGraph();
    const [isClicked, setIsClicked] = useState<string>();
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [currCollection, setCurrCollection] = useState(new Set());

    return (
        <>
            <div className="bg-white rounded-3xl px-3 py-2">
                <div className="flex items-center">
                    {options?.map((option, index) =>
                        <div className="flex items-center">
                            <div className="relative h-8 p-6 py-4 text-xs rounded-3xl text-white bg-[#7C4DFF] flex items-center justify-center cursor-pointer outline-none select-none" onClick={() => {
                                // if not open simply open the dropdown, if already then close only if the same locale dropdown clicked else need to transfer it
                                if (open && (selectedType === option.type)) {
                                    setOpen(false);
                                }
                                else {
                                    setOpen(true)
                                    // set the type and collection -> collection determines and type determines what is selected
                                    option.type === "locale" ? setCurrCollection(localeCollection) :
                                        option.type === "content-type" ? setCurrCollection(contentTypeCollection) :
                                            option.type === "workflow" ? setCurrCollection(workflowCollection) :
                                                setCurrCollection(new Set());
                                    setSelectedType(option.type);
                                }
                            }}>
                                <div className={`flex items-center mr-2 gap-1`}>
                                    <span>{option.label}</span>
                                    {/* only the correct option needs to be clicked */}
                                    {isClicked && (filter?.[option.value]) && <span> : {isClicked}</span>}
                                </div>
                                <MdArrowDropDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white" />
                                {open && option.type === selectedType && Array.from(currCollection).length > 0 &&
                                    <div className={`h-48 absolute top-11 left-0 w-40 flex flex-col gap-2 justify-start bg-white rounded-lg p-4 overflow-y-scroll`}>
                                        <div className="flex flex-col gap-2 pt-1">
                                            {
                                                Array.from(currCollection as Set<string>).map((item: string) => <FilterItem key={item} item={item} type={option.type} isClicked={isClicked === item ? true : false} setIsClicked={setIsClicked} />)
                                            }
                                        </div>
                                    </div>
                                }
                            </div>
                            {(index !== options?.length - 1) && <div className="h-7 bg-purple-300 w-[1px] mx-2"></div>}
                        </div>
                    )}
                </div>
            </div>
            <div onClick={() => {
                // set the filter, type, the currCollection to be displayed as null
                useGraph.getState().setFilter("", "");
                setIsClicked("");
                setSelectedType(null);
                setCurrCollection(new Set());
            }}
                className="h-8 p-6 py-4 text-xs rounded-3xl cursor-pointer bg-gradient-to-r from-[#7C4DFF] from-60% to-[#EC3DC8] bg-opacity-40 text-white flex justify-center items-center">
                Reset
            </div>
        </>
    );
}

export default Filter;