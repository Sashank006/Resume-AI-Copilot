import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";
function App() {
  const [activeTab, setActiveTab] = useState('login'); // default to login 
  const [resumeForATS, setResumeForATS] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [atsResult, setAtsResult] = useState({ score: "", text: "" });
  const [loadingATS, setLoadingATS] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const generatedRef = useRef();
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [userId, setUserId] = useState("683ddacce76452d8a27f9ce7"); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [editableResume, setEditableResume] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
      const storedId = localStorage.getItem("userId");
      const storedEmail = localStorage.getItem("userEmail");
      if (storedId) setUserId(storedId);
      if (storedEmail) setUserEmail(storedEmail);
    }, []);



    const handleRegister = async () => {
    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerEmail, password: registerPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setRegisterMessage("Registration successful! You can now log in.");
        setRegisterEmail('');
        setRegisterPassword('');
      } else {
        setRegisterMessage(data.error || "Registration failed.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setRegisterMessage("Something went wrong.");
    }
  };


  const handleLogin = async () => {
  try {
    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    });

    const data = await res.json();

    if (res.ok) {
      setUserId(data.userId);
      setUserEmail(data.email);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userEmail", data.email);
      setLoginMessage("Login successful!");
      setActiveTab("generate");
    }

    else {
      setLoginMessage(data.error || "Login failed.");
    }
  } catch (err) {
    console.error("Login error:", err);
    setLoginMessage("Something went wrong.");
  }
};


  const handleDownloadPDF = () => {
  if (!generatedRef.current) return;
  html2pdf()
    .from(`<pre style="font-family: monospace;">${editableResume}</pre>`)
    .set({
      margin: 0.5,
      filename: 'generated_resume.pdf',
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    })
    .save();
};


  const handleFileUpload = async () => {
  if (!resumeFile) return;
  const formData = new FormData();
  formData.append("file", resumeFile);

  try {
    const res = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    setResume(data.text);        // Analyze tab
    setResumeForATS(data.text);  // ATS tab
    await handleExtractFields(data.text);
  } catch (err) {
    console.error("Upload error:", err);
  }
};



  // Analyze Mode
  const [resume, setResume] = useState('');
  const [role, setRole] = useState('SWE Intern');
  const [feedback, setFeedback] = useState('');

  // Generate Mode
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    education: '',
    experience: '',
    skills: ''
  });
  const [generatedResume, setGeneratedResume] = useState('');

  const handleAnalyze = async () => {
    if (!resume.trim()) return;
    try {
      const res = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume })
      });
      const data = await res.json();
      setFeedback(data.feedback);
    } catch (err) {
      console.error("Analyze error:", err);
    }
  };

  const handleGenerate = async () => {
    try {
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setEditableResume(data.generated);
    } catch (err) {
      console.error("Generate error:", err);
    }
  };
  const handleExtractFields = async (text) => {
  try {
    const res = await fetch("http://localhost:5000/extract-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: text })
    });
    const data = await res.json();

    if (res.ok) {
      const parsed = JSON.parse(data.fields); // JSON string from LLM

      setFormData({
        name: parsed.name || "",
        email: parsed.email || "",
        education: parsed.education || "",
         experience: Array.isArray(parsed.experience)
            ? parsed.experience.map(e => JSON.stringify(e)).join("\n")
            : parsed.experience || "",
        skills: parsed.skills || ""
      });
      setActiveTab("generate");
    }
  } catch (err) {
    console.error("Field extraction failed:", err);
  }
};

  useEffect(() => {
    const fetchResumes = async () => {
      if (activeTab === 'saved') {
        setLoadingSaved(true);
        try {
          const res = await fetch(`http://localhost:5000/resumes/${userId}`);
          const data = await res.json();
          setSavedResumes(data.resumes);
        } catch (err) {
          console.error("Error fetching saved resumes:", err);
        } finally {
          setLoadingSaved(false);
        }
      }
    };
    fetchResumes();
  }, [activeTab,userId]);
    const handleDownloadTXT = () => {
    const blob = new Blob([editableResume], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resume.txt";
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleDownloadDocx = () => {
  const lines = editableResume.split("\n");
  const doc = new Document({
    sections: [
      {
        children: lines.map((line) => new Paragraph(line)),
      },
    ],
  });

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, "resume.docx");
  });
};
const handleDelete = async (resumeId) => {
  try {
    const res = await fetch(`http://localhost:5000/resume/${resumeId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setSavedResumes(prev => prev.filter(r => r._id !== resumeId));
    } else {
      console.error("Failed to delete resume");
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
};

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white text-black dark:bg-gray-900 dark:text-white">
       <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 mt-12 rounded shadow bg-gray-50 dark:bg-gray-800">
          {userId && userEmail && (
            <>
            <div className="text-sm mb-4 text-right">
              Logged in as: <span className="font-semibold">{userEmail}</span>
              <button
                className="ml-3 text-red-600 underline"
                onClick={() => {
                  localStorage.removeItem("userId");
                  localStorage.removeItem("userEmail");
                  setUserId("");
                  setUserEmail("");
                  setActiveTab("login");
                }}
              >
                Logout
              </button>
            </div>
            <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-center mb-4">
              Welcome back, <span className="font-semibold text-green-700">{userEmail}</span>!
            </div>
            </>
          )}
          <div className="text-right mb-2">
            <button
              onClick={() =>{ 
                console.log("Toggle clicked", darkMode);
                setDarkMode(!darkMode);
              }}
              className="text-sm underline text-gray-600 dark:text-gray-300"
            >
              Toggle {darkMode ? 'Light' : 'Dark'} Mode
            </button>
          </div>
          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`px-4 py-2 rounded font-semibold ${
                activeTab === 'login' ? 'bg-red-600 text-white' : 'bg-gray-200'
              }`}
            >
              Login
            </button>

            <button
              onClick={() => setActiveTab('analyze')}
              className={`px-4 py-2 rounded font-semibold ${
              activeTab === 'analyze' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Analyze
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 rounded font-semibold ${
              activeTab === 'generate' ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setActiveTab('ats')}
              className={`px-4 py-2 rounded font-semibold ${
              activeTab === 'ats' ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}
            >
            ATS Score
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 rounded font-semibold ${
                activeTab === 'saved' ? 'bg-yellow-600 text-white' : 'bg-gray-200'
              }`}
            >
            My Resumes
            </button>
          </div>
        </div>
      </div>
  
      {activeTab === 'saved' && (
        <>
          {loadingSaved ? (
            <p className="text-gray-500 italic">Loading saved resumes...</p>
          ) : savedResumes.length === 0 ? (
            <p>No saved resumes found.</p>
          ) : (
            <div className="space-y-4">
              {savedResumes.map((res, idx) => (
                <div key={res._id} className="border p-4 rounded bg-yellow-50">
                  <h3 className="font-semibold mb-1">{res.metadata?.name || "Unnamed Resume"}</h3>
                  <p className="text-sm text-gray-600 mb-2">{res.metadata?.email}</p>
                  <p className="text-xs text-gray-400">
                    Created at: {new Date(res.metadata?.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-3 whitespace-pre-line">
                    {res.resume.slice(0, 300)}{res.resume.length > 300 ? '...' : ''}
                  </p>
                 <button
                  className="mt-2 text-sm text-blue-600 underline"
                  onClick={() => {
                    navigator.clipboard.writeText(res.resume);
                    setCopiedIndex(idx);
                    setTimeout(() => setCopiedIndex(null), 2000); // hide after 2s
                  }}
                >
                  {copiedIndex === idx ? "Copied!" : "Copy to Clipboard"}
                </button>
                <button
                  className="ml-4 text-sm text-red-600 underline"
                  onClick={() => handleDelete(res._id)}
                >
                  Delete
                </button>

                </div>
              ))}
            </div>
          )}
        </>
      )}


      {activeTab === 'analyze' && (
          <>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Upload Resume (PDF):</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={handleFileUpload}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Upload
                </button>
              </div>

              <div>
                <label className="block font-medium mb-1">Paste Your Resume:</label>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  rows={6}
                  className="w-full p-3 border rounded resize-y"
                  placeholder="Paste your resume here..."
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Target Role:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option>SWE Intern</option>
                  <option>Data Analyst</option>
                  <option>ML Research Intern</option>
                  <option>Product Intern</option>
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
              >
                Analyze
              </button>
            </div>

            {feedback && (
              <div className="mt-6 p-4 border bg-blue-50 rounded text-sm whitespace-pre-wrap">
                <h2 className="font-bold text-lg mb-2">Feedback:</h2>
                <p>{feedback}</p>
              </div>
            )}
          </>
        )}

      {activeTab === 'generate' && (
        <>
          {['name', 'email', 'education', 'experience', 'skills'].map((field) => (
            <div key={field} className="mb-4">
              <label className="block font-medium capitalize mb-1">
                {field}
              </label>
              <textarea
                rows={field === 'name' || field === 'email' ? 1 : 3}
                className="w-full p-2 border rounded"
                placeholder={`Enter your ${field}`}
                value={formData[field]}
                onChange={(e) =>
                  setFormData({ ...formData, [field]: e.target.value })
                }
              />
            </div>
          ))}

          <button
            onClick={handleGenerate}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded"
          >
            Generate Resume
          </button>

         {editableResume && (
          <div className="mt-6">
            <label className="block font-semibold mb-2">Edit Your Resume:</label>
            <textarea
              value={editableResume}
              onChange={(e) => setEditableResume(e.target.value)}
              rows={20}
              className="w-full p-4 border rounded resize-y font-mono text-sm"
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleDownloadPDF}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded"
              >
                Download as PDF
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(editableResume)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleDownloadTXT}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded"
              >
                Download as TXT
              </button>
              <button
                onClick={handleDownloadDocx}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded"
              >
                Download as DOCX
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("http://localhost:5000/save-resume", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        resume: editableResume,
                        userId,
                        name: formData.name,
                        email: formData.email
                      }),
                    });
                    const data = await res.json();
                    alert(data.message || "Saved!");
                  } catch (err) {
                    alert("Failed to save resume");
                  }
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded"
              >
                Save to My Resumes
              </button>
            </div>
          </div>
        )}
           </>
      )}
      {activeTab === 'ats' && (
        <>
          <label className="block font-medium mb-1">Upload Resume (PDF):</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setResumeFile(e.target.files[0])}
            className="mb-2"
          />
          <button
            onClick={handleFileUpload}
            className="bg-gray-500 text-white px-3 py-1 rounded mb-4"
          >
            Upload 
          </button>

          <label className="block font-medium mb-1">Paste Your Resume:</label>
          <textarea
            value={resumeForATS}
            onChange={(e) => setResumeForATS(e.target.value)}
            rows={6}
            className="w-full p-3 border rounded resize-y mb-4"
            placeholder="Paste your resume..."
          />

          <label className="block font-medium mb-1">Paste Job Description:</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
            className="w-full p-3 border rounded resize-y mb-4"
            placeholder="Paste the job description..."
          />

          <button
           onClick={async () => {
            setLoadingATS(true);
            try {
              const res = await fetch("http://localhost:5000/ats-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  resume: resumeForATS,
                  job: jobDescription
                })
              });
              const data = await res.json();
             const [scoreLine, ...rest] = data.result.split('\n');
              const score = scoreLine.match(/\d+/)?.[0]; 
              const restText = rest.join('\n');
              setAtsResult({ score, text: restText })
            } catch (err) {
              console.error("ATS Error:", err);
              setAtsResult({ score: "", text: "Error evaluating ATS score." });
            } finally {
              setLoadingATS(false);
            }
          }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded"
          >
            Evaluate ATS Score
          </button>
          {loadingATS && (
          <div className="mt-4 text-gray-500 italic text-sm animate-pulse">
            Generating ATS feedback...
          </div>
          )}


          {atsResult.text && (
          <div className="mt-6 p-4 border bg-purple-50 rounded text-sm whitespace-pre-wrap">
            <h2 className="font-bold text-lg mb-2">ATS Evaluation</h2>

            {atsResult.score && (
              <div className="mb-4">
                <p className="font-medium">
                  Match Score: <span className="text-purple-700 font-bold">{atsResult.score}/100</span>
                </p>
                <div className="w-full bg-gray-200 rounded h-2 mt-1">
                  <div
                    className="bg-purple-600 h-2 rounded"
                    style={{ width: `${atsResult.score}%` }}
                  />
                </div>
              </div>
            )}

            <div>{atsResult.text}</div>
          </div>
        )}
        </>
      )}
      {activeTab === 'login' && !userId &&(
        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Email:</label>
            <input
              type="email"
              className="w-full p-2 border rounded"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Password:</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>
          <button
            onClick={handleLogin}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded"
          >
            Login
          </button>
          {loginMessage && <p className="text-sm text-gray-600 mt-2">{loginMessage}</p>}
          <hr className="my-6" />
          <h2 className="text-lg font-semibold mb-2">Register</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Email:</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Password:</label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
            </div>
            <button
              onClick={handleRegister}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
            >
              Register
            </button>
            {registerMessage && (
              <p className="text-sm text-gray-600 mt-2">{registerMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
  
}

export default App;




