import { Dispatch, SetStateAction } from "react";
import useGraph from "./views/GraphView/stores/useGraph";

const FilterItem = ({ item, type, isClicked, setIsClicked }: { item: string, type: string, isClicked: boolean, setIsClicked: Dispatch<SetStateAction<string | undefined>> }) => {
    const { setFilter, setFilterVisibility } = useGraph();

    return(
        <div className={`relative h-8 px-6 text-xs rounded-3xl flex items-center justify-center cursor-pointer outline-none select-none ${!isClicked ? "hover:bg-[#7C4DFF] hover:text-white text-[#7C4DFF]" : "bg-[#7C4DFF] text-white"}`}
            onClick={() => {
                setIsClicked(item || ""); // set the one which clicked
                setFilter(type, item); // set the filter as filter changes nodes are highlighted
                setFilterVisibility(item, type); // nodes are highlighted via this
            }}
        >
            {item}
        </div>
    );
}

export default FilterItem;