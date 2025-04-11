import { MdArrowDropDown } from "react-icons/md";
import useGraph from "./views/GraphView/stores/useGraph";
import { useState } from "react";

const Select = ({ options }: { options: { value: string, label: string }[] }) => {
    const [open, setOpen] = useState(false);
    const [locale, setLocale] = useState("");

    const handleLocaleChange = (locale: string) => {
        // Filter nodes based on locale
        useGraph.getState().setFilterVisibility(locale, "locale");
    };

    return (
        <div className="relative text-sm h-10 w-40 p-6 bg-black text-white rounded-lg flex items-center justify-center cursor-pointer outline-none" onClick={() => setOpen(!open)}>
            <div className={`mr-4`}>{locale ? locale.toUpperCase() : "Select Locale"}</div>
            {open && <div className={`absolute top-14 left-0 w-40 flex flex-col gap-2 bg-white rounded-lg p-4`}>
                {options?.map((option) => (
                    <button key={option.value} value={option.value} className="w-full text-black hover:bg-gray-100 p-2 rounded-lg" onClick={() => {
                        setLocale(option.value);
                        handleLocaleChange(option.value)}
                    }>{option.label}</button>
                ))}
            </div>}
            <MdArrowDropDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white" />
        </div>
    );
}

export default Select;