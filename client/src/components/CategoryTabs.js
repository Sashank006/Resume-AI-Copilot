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
    <div className="w-full max-w-5xl mx-auto px-4 py-8 text-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-md">
      {/* Top-Level Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {Object.entries(categories).map(([key, val]) => (
          <button
            key={key}
            onClick={() => toggleTab(key)}
            className={`px-5 py-2 rounded-xl font-medium transition-all duration-200 border border-gray-300 dark:border-gray-600 ${
              active === key
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:shadow"
            }`}
          >
            {val.title}
          </button>
        ))}
      </div>

      {/* Sub-buttons appear when active */}
      <div
        className={`transition-all duration-300 ${
          active ? "opacity-100 scale-100" : "opacity-0 scale-95 h-0 overflow-hidden"
        }`}
      >
        <div className="flex flex-wrap justify-center gap-4">
          {active &&
            categories[active].buttons.map((label) => (
              <button
                key={label}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm transition"
              >
                {label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
