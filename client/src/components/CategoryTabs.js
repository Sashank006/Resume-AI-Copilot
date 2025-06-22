import React, { useState } from "react";

const categories = {
  resume: {
    title: "Resume",
    buttons: ["ATS Score", "Generate", "Analyze", "My Resumes"],
  },
  jobs: {
    title: "Job Application",
    buttons: ["My Applications", "Auto-Apply", "Job Match"],
  },
  feedback: {
    title: "Feedback",
    buttons: ["Feedback"],
  },
};

const CategoryTabs = () => {
  const [active, setActive] = useState(null);

  const toggleTab = (key) => {
    setActive((prev) => (prev === key ? null : key));
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 text-center">
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {Object.entries(categories).map(([key, val]) => (
          <button
            key={key}
            onClick={() => toggleTab(key)}
            className={`px-4 py-2 rounded-lg transition ${
              active === key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
            }`}
          >
            {val.title}
          </button>
        ))}
      </div>

      {active && (
        <div className="flex flex-wrap justify-center gap-4 transition-all duration-300">
          {categories[active].buttons.map((label) => (
            <button
              key={label}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryTabs;
