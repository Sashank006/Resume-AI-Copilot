import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { Github, Linkedin } from 'lucide-react';
import { Sun, Moon, Search, MapPin, Clock, Building, DollarSign, Send, Eye, Filter, RefreshCw,} from 'lucide-react';
import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { Toaster, toast } from 'react-hot-toast';
function App() {
  const [userId, setUserId] = useState(null); 
  const [activeTab, setActiveTab] = useState('home');
  const [resumeForATS, setResumeForATS] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [atsResult, setAtsResult] = useState({ score: "", text: "" });
  const [loadingATS, setLoadingATS] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const generatedRef = useRef();
  const [filterTag, setFilterTag] = useState('');
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [resumeTag, setResumeTag] = useState("");
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [editableResume, setEditableResume] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [tagToRename, setTagToRename] = useState('');
  const [resumeIdToRename, setResumeIdToRename] = useState('');
  const [newTag, setNewTag] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [manualCoverLetters, setManualCoverLetters] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobBoard, setSelectedJobBoard] = useState('indeed');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [jobFilters, setJobFilters] = useState({
    experience: '',
    company: '',
    remote: false,
    datePosted: ''
  });
  const [matchingResume, setMatchingResume] = useState('');
  const [applicationStatus, setApplicationStatus] = useState({});
  const [coverLetter, setCoverLetter] = useState('');
  const [autoApplySettings, setAutoApplySettings] = useState({
    maxApplicationsPerDay: 10,
    minMatchScore: 70,
    preferredCompanies: [],
    blacklistCompanies: [],
    autoGenerateCoverLetter: true
  });
  const [matchResume, setMatchResume] = useState('');
  const [matchJob, setMatchJob] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const filteredResumes = savedResumes.filter(
    (res) => !filterTag || res.metadata?.tag === filterTag
  );
  const [expandedResumeIds, setExpandedResumeIds] = useState([]);
  const sortedResumes = [...filteredResumes].sort(
    (a, b) => new Date(b.metadata?.createdAt) - new Date(a.metadata?.createdAt)
  );
  const [expandedJobs, setExpandedJobs] = useState({});
  const [expandedJobIds, setExpandedJobIds] = useState([]);
  useEffect(() => {
      localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);

  useEffect(() => {
      const storedId = localStorage.getItem("userId");
      const storedEmail = localStorage.getItem("userEmail");
      if (storedId) {
        setUserId(storedId);
        setActiveTab("home");
      }
      if (storedEmail) setUserEmail(storedEmail);
    }, []);
  const handleJobSearch = async () => {
      setLoadingJobs(true);
      try {
        const response = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${jobSearchQuery || 'Software Engineer'}&page=1&num_pages=1`,
          {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': 'your-api-key-here',
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
          }
        );

        const data = await response.json();
        const rawJobs = data.data.map((job) => ({
          id: job.job_id,
          title: job.job_title,
          company: job.employer_name,
          location: job.job_city || 'Unknown',
          description: job.job_description,
          jobBoard: 'RapidAPI',
          remote: job.job_is_remote || false
        }));

        const resumeToUse = resumeForATS || editableResume;

        const scoredJobs = await Promise.all(
          rawJobs.map(async (job) => {
            try {
              const atsRes = await fetch("http://localhost:5000/ats-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  resume: resumeToUse,
                  job: job.description
                })
              });

              const atsData = await atsRes.json();
              const score = parseInt(atsData.result.match(/\d+/)?.[0]) || 0;

              return { ...job, matchScore: score };
            } catch (err) {
              console.error("ATS score fetch failed for job:", job.title, err);
              return { ...job, matchScore: 0 };
            }
          })
        );

        setJobs(scoredJobs);
      } catch (error) {
        console.error('Job API fetch failed:', error);
      } finally {
        setLoadingJobs(false);
      }
    };
    const toggleJobExpand = (jobId) => {
      setExpandedJobIds((prev) =>
        prev.includes(jobId)
          ? prev.filter((id) => id !== jobId)
          : [...prev, jobId]
      );
    };

    const generateCoverLetter = async (job) => {
      const prompt = `Generate a cover letter for the following job application:
      
  Job Title: ${job.title}
  Company: ${job.company}
  Job Description: ${job.description}
  Requirements: ${job.requirements.join(', ')}

  User Resume: ${matchingResume || editableResume}

  Generate a professional, personalized cover letter.`;

      try {
        // Mock response - replace with actual API call
        const generatedLetter = `Dear ${job.company} Hiring Team,

  I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my background in ${job.requirements.slice(0, 2).join(' and ')}, I am excited about the opportunity to contribute to your team.

  My experience with ${job.requirements[0]} and passion for ${job.requirements[1]} align perfectly with your requirements. I am particularly drawn to ${job.company}'s innovative approach and would love to bring my skills to help drive your mission forward.

  Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team.

  Best regards,
  [Your Name]`;

        setCoverLetter(generatedLetter);
        return generatedLetter;
      } catch (error) {
        console.error('Cover letter generation error:', error);
        return '';
      }
    };

   const applyToJob = async (job, manualLetter = "") => {
    setApplicationStatus(prev => ({ ...prev, [job.id]: 'applying' }));

    try {
      let letter = manualLetter || coverLetter;

      if (autoApplySettings.autoGenerateCoverLetter && !letter) {
        letter = await generateCoverLetter(job);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      const appliedJob = {
        ...job,
        appliedAt: new Date(),
        coverLetter: letter
      };

      setApplicationStatus(prev => ({ ...prev, [job.id]: 'applied' }));
      setAppliedJobs(prev => [...prev, appliedJob]);
      await fetch("http://localhost:5000/save-applied-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          job: appliedJob
        })
      });

      toast.success(`Applied to ${job.title} at ${job.company}`);
    } catch (error) {
      console.error("Application error:", error);
      setApplicationStatus(prev => ({ ...prev, [job.id]: 'failed' }));
      toast.error(`Failed to apply to ${job.title}`);
    }
  };
  useEffect(() => {
    const fetchApplied = async () => {
      try {
        const res = await fetch(`http://localhost:5000/applied-jobs/${userId}`);
        const data = await res.json();
        setAppliedJobs(data.appliedJobs); // backend returns { appliedJobs: [...] }
      } catch (error) {
        console.error("Failed to fetch applied jobs:", error);
      }
    };

    if (userId && activeTab === 'applications') {
      fetchApplied();
    }
  }, [activeTab, userId]);

    const autoApplyToJobs = async () => {
      const eligibleJobs = jobs.filter(job => 
        job.matchScore >= autoApplySettings.minMatchScore &&
        !appliedJobs.some(applied => applied.id === job.id) &&
        !autoApplySettings.blacklistCompanies.includes(job.company)
      );

      const jobsToApply = eligibleJobs.slice(0, autoApplySettings.maxApplicationsPerDay);

      for (const job of jobsToApply) {
        await applyToJob(job);
        await new Promise(resolve => setTimeout(resolve, 5000)); // simulate delay
      }
      if (activeTab === 'applications') {
        try {
          const res = await fetch(`http://localhost:5000/get-applied-jobs?userId=${userId}`);
          const data = await res.json();
          setAppliedJobs(data.jobs || []);
        } catch (err) {
          console.error("Error syncing applications after auto-apply:", err);
        }
      }

      toast.success("Auto-apply finished!");
    };

  const getMatchScoreColor = (score) => {
      if (score >= 90) return 'text-green-600';
      if (score >= 75) return 'text-blue-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

  const getJobBoardIcon = (board) => {
      const icons = {
        linkedin: '🔗',
        indeed: '🔍',
        glassdoor: '🏢',
        ziprecruiter: '⚡'
      };
      return icons[board] || '💼';
    };
  const handleMatchScore = async () => {
      if (!matchResume || !matchJob) {
        toast.error("Please paste both resume and job description");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/ats-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume: matchResume,
            job: matchJob
          })
        });

        const data = await res.json();
        setMatchResult(data.result || "No result received.");
      } catch (error) {
        console.error("Match score error:", error);
        toast.error("Error fetching match score.");
      }
    };

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
        setActiveTab("home");
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
    skills: '',
    includeGPA: false,
    skillsFirst: false
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
      if (
        !formData.name.trim() &&
        !formData.education.trim() &&
        !formData.experience.trim()
      ) {
        toast.error("Please fill out at least one field before generating.");
        return;
      }
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role })
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
 const handleRewriteResume = async () => {
  if (!resumeForATS || !jobDescription) {
    toast.error("Paste both resume and job description");
    return;
  }
  try {
    const res = await fetch("http://localhost:5000/rewrite-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: resumeForATS,
        job: jobDescription
      })
    });
    const Spinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

    const data = await res.json();
    setEditableResume(data.rewritten || "No rewrite returned.");
  } catch (err) {
    console.error("Rewrite error:", err);
    toast.error("Failed to rewrite resume.");
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
const downloadResume = (text, type) => {
  const filename = `resume.${type}`;

  if (type === 'pdf') {
    const element = document.createElement('div');
    element.innerHTML = `<pre style="font-family: monospace;">${text}</pre>`;

    const opt = {
      margin: 0.5,
      filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
    return;
  }

  let blob;
  if (type === 'txt') {
    blob = new Blob([text], { type: 'text/plain' });
  } else if (type === 'docx') {
    blob = new Blob([text], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
useEffect(() => {
  localStorage.setItem("resumeData", JSON.stringify({
    resume: editableResume,
    formData,
    tag: resumeTag
  }));
}, [editableResume, formData, resumeTag]);

useEffect(() => {
  const saved = JSON.parse(localStorage.getItem("resumeData"));
  if (saved) {
    setEditableResume(saved.resume || "");
    setFormData(saved.formData || {});
    setResumeTag(saved.tag || "");
  }
}, []);

const handleSubmitFeedback = async () => {
  if (!feedbackMessage.trim()) {
    toast.error("Please enter a message.");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/submit-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: feedbackName,
        email: feedbackEmail,
        category: feedbackCategory,
        message: feedbackMessage
      })
    });

    const data = await res.json();
    if (res.ok) {
      toast.success(data.message || "Feedback submitted!");
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackCategory('');
      setFeedbackMessage('');
    } else {
      toast.error(data.error || "Submission failed.");
    }
  } catch (err) {
    toast.error("Server error. Please try again later.");
  }
};

  return (
    <div className={darkMode ? 'dark' : ''}>
    <Toaster position="top-right" />
      <div className="bg-white dark:bg-gray-900 text-black dark:text-white transition-colors">
       <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 mt-4 rounded shadow bg-gray-50 dark:bg-gray-800">
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
            <div className="p-3 rounded text-sm text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold">
                Welcome to Your AI-Powered Job Matching Platform! 🚀
              </div>
            </>
          )}
          {activeTab !== 'home' && (
            <div className="flex gap-4 justify-center mb-6">
            {activeTab !== 'login' && !userId && (
              <button
                onClick={() => setActiveTab('login')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'login'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Login
              </button>
            )}
            <button
                onClick={() => setActiveTab('jobs')}
                className={`px-4 py-2 rounded font-semibold transition text-xs ${
                  activeTab === 'jobs'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Job Search
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-4 py-2 rounded font-semibold transition text-xs ${
                  activeTab === 'applications'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                My Applications
              </button>
              <button
                onClick={() => setActiveTab('auto-apply')}
                className={`px-4 py-2 rounded font-semibold transition text-xs ${
                  activeTab === 'auto-apply'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Auto-Apply
              </button>
              <button
                onClick={() => setActiveTab('match')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'match'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Job Match
              </button>
              <button
                onClick={() => setActiveTab('analyze')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'analyze'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Analyze
              </button>

              <button
                onClick={() => setActiveTab('generate')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'generate'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Generate
              </button>

              <button
                onClick={() => setActiveTab('ats')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'ats'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                ATS Score
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'saved'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                My Resumes
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`px-4 py-2 rounded font-semibold transition ${
                  activeTab === 'feedback'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-black dark:text-black'
                }`}
              >
                Feedback
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="absolute top-4 right-4 p-2"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'jobs' && (
        <div className=" w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Job Search</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by title or company"
              className="p-2 border rounded w-full"
              value={jobSearchQuery}
              onChange={(e) => setJobSearchQuery(e.target.value)}
            />
            <input
              type="text"
              placeholder="Location"
              className="p-2 border rounded w-full"
              value={jobLocation}
              onChange={(e) => setJobLocation(e.target.value)}
            />
            <select
              className="p-2 border rounded w-full"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Internship">Internship</option>
            </select>
            <select
              className="p-2 border rounded w-full"
              value={selectedJobBoard}
              onChange={(e) => setSelectedJobBoard(e.target.value)}
            >
              <option value="">All Boards</option>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="glassdoor">Glassdoor</option>
              <option value="ziprecruiter">ZipRecruiter</option>
            </select>
          </div>

          <button
            onClick={handleJobSearch}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 mb-4"
          >
            Search Jobs
          </button>

        {loadingJobs ? (
          <p>Spinner</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="border p-4 rounded mb-4">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold text-lg">
                    {getJobBoardIcon(job.jobBoard)} {job.title}
                  </h3>
                  <p className="text-sm text-gray-600">{job.company} - {job.location}</p>
                </div>
                <div className={`text-sm font-bold ${getMatchScoreColor(job.matchScore)}`}>
                  {job.matchScore}%
                </div>
              </div>

              <p
                className={`text-sm mt-2 transition-all duration-300 ${
                  expandedJobs[job.id] ? "" : "line-clamp-3"
                }`}
              >
                {job.description}
              </p>

              <button
                onClick={() =>
                  setExpandedJobs((prev) => ({
                    ...prev,
                    [job.id]: !prev[job.id],
                  }))
                }
                className="text-blue-600 text-sm underline mt-1"
              >
                {expandedJobs[job.id] ? "View Less" : "View More"}
              </button>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <textarea
                  placeholder="Optional: Write a custom cover letter..."
                  className="w-full p-2 border rounded text-sm"
                  value={manualCoverLetters[job.id] || ""}
                  onChange={(e) =>
                    setManualCoverLetters((prev) => ({
                      ...prev,
                      [job.id]: e.target.value,
                    }))
                  }
                />
                <button
                  onClick={() => applyToJob(job, manualCoverLetters[job.id])}
                  disabled={applicationStatus[job.id] === "applied"}
                  className={`w-full sm:w-auto px-3 py-2 rounded ${
                    applicationStatus[job.id] === "applied"
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {applicationStatus[job.id] === "applied" ? "Applied" : "Apply Now"}
                </button>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {activeTab === 'auto-apply' && (
        <div className="max-w-xl mx-auto p-4">
          <h2 className="text-2xl font-bold mb-4">Auto-Apply Settings</h2>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoApplySettings.autoGenerateCoverLetter}
                onChange={(e) =>
                  setAutoApplySettings(prev => ({
                    ...prev,
                    autoGenerateCoverLetter: e.target.checked
                  }))
                }
              />
              Auto-generate cover letters
            </label>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Minimum Match Score</label>
            <input
              type="number"
              value={autoApplySettings.minMatchScore}
              onChange={(e) =>
                setAutoApplySettings(prev => ({
                  ...prev,
                  minMatchScore: parseInt(e.target.value) || 0
                }))
              }
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              min={0}
              max={100}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Max Applications Per Day</label>
            <input
              type="number"
              value={autoApplySettings.maxApplicationsPerDay}
              onChange={(e) =>
                setAutoApplySettings(prev => ({
                  ...prev,
                  maxApplicationsPerDay: parseInt(e.target.value) || 0
                }))
              }
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Blacklist Companies (comma-separated)</label>
            <input
              type="text"
              value={autoApplySettings.blacklistCompanies.join(', ')}
              onChange={(e) =>
                setAutoApplySettings(prev => ({
                  ...prev,
                  blacklistCompanies: e.target.value.split(',').map(c => c.trim())
                }))
              }
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
          </div>

          <button
            onClick={autoApplyToJobs}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold"
          >
            Run Auto-Apply Now
          </button>
        </div>
      )}



      {activeTab === 'home' && (
        <div className="text-center py-20 px-4">
          <img src="/favicon.png" alt="AI Resume" className="w-48 mx-auto mb-6" />
          <h1 className="text-4xl font-extrabold mb-2 text-gray-800 dark:text-white">Land Your Dream Job</h1>
          <p className="text-md text-gray-600 dark:text-gray-300 mb-6">
            Instantly create tailored, ATS-optimized resumes with the power of AI.
          </p>
          <button
            onClick={() => setActiveTab('login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded"
          >
            Get Started
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto mt-12">
            <div className="p-4 border rounded shadow dark:bg-gray-800">
              <h2 className="text-lg font-semibold">🧠 ATS & Match Scoring</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Instantly check how well your resume matches any job description.
              </p>
            </div>
            <div className="p-4 border rounded shadow dark:bg-gray-800">
              <h2 className="text-lg font-semibold">📝 AI Resume Generator</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate tailored resumes with GPT-style intelligence.
              </p>
            </div>
            <div className="p-4 border rounded shadow dark:bg-gray-800">
              <h2 className="text-lg font-semibold">🚀 Auto-Apply System</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Let the system apply to jobs for you while you chill.
              </p>
            </div>
            <div className="p-4 border rounded shadow dark:bg-gray-800">
              <h2 className="text-lg font-semibold">💾 Save & Tag Resumes</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Store multiple resume versions and manage them with tags.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="max-w-4xl mx-auto p-4">
          <h2 className="text-2xl font-bold mb-4">My Applications</h2>
          
          {appliedJobs.length === 0 ? (
            <p className="text-gray-600 italic">You haven’t applied to any jobs yet.</p>
          ) : (
            appliedJobs.map((job) => (
              <div key={job.id} className="border p-4 rounded mb-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-sm text-gray-600">
                      {job.company} — {job.location}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    Applied on {new Date(job.appliedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm mt-2">{job.description.slice(0, 150)}...</p>

                {job.coverLetter && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600 underline text-sm">View Cover Letter</summary>
                    <pre className="bg-white dark:bg-gray-900 p-3 mt-2 text-sm whitespace-pre-wrap border rounded">
                      {job.coverLetter}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {activeTab === 'saved' && (
        <>
          {loadingSaved ? (
            <p className="text-gray-500 italic">Loading saved resumes...</p>
          ) : savedResumes.length === 0 ? (
            <p>No saved resumes found.</p>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <label className="block font-medium mb-1">Filter by Tag:</label>
                <select
                  onChange={(e) => setFilterTag(e.target.value)}
                  value={filterTag}
                  className="p-2 border rounded dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All</option>
                  {[...new Set(savedResumes.map((r) => r.metadata?.tag).filter(Boolean))].map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              {sortedResumes.map((res, idx) => (
                <div key={res._id} className="border p-4 rounded bg-yellow-50">
                  <h3 className="font-semibold mb-1">
                    {res.metadata?.name || "Unnamed Resume"}{" "}
                    {res.metadata?.tag && (
                      <span className="text-sm text-purple-600 font-normal ml-2 flex items-center gap-2">
                        [{res.metadata.tag}]
                        <button
                          onClick={() => {
                            setTagToRename(res.metadata.tag);
                            setResumeIdToRename(res._id);
                            setNewTag(res.metadata.tag);
                            setShowRenameModal(true);
                          }}
                          className="text-blue-500 text-xs underline"
                        >
                          Rename
                        </button>
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{res.metadata?.email}</p>
                  <p className="text-xs text-gray-400">
                    Created at: {new Date(res.metadata?.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                    {expandedResumeIds.includes(res._id)
                      ? res.resume
                      : `${res.resume.slice(0, 300)}${res.resume.length > 300 ? '...' : ''}`}
                  </p>
                  <button
                    className="mt-1 text-sm text-blue-600 underline"
                    onClick={() => {
                      setExpandedResumeIds((prev) =>
                        prev.includes(res._id)
                          ? prev.filter((id) => id !== res._id)
                          : [...prev, res._id]
                      );
                    }}
                  >
                    {expandedResumeIds.includes(res._id) ? 'Show Less' : 'View Full'}
                  </button>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    className="text-sm text-blue-600 underline"
                    onClick={() => {
                      navigator.clipboard.writeText(res.resume);
                      setCopiedIndex(idx);
                      setTimeout(() => setCopiedIndex(null), 2000);
                    }}
                  >
                    {copiedIndex === idx ? "Copied!" : "Copy to Clipboard"}
                  </button>
                  <button
                    className="text-sm text-green-600 underline mt-2"
                    onClick={() => {
                      setSelectedResume(res.resume);
                      setShowModal(true);
                    }}
                  >
                    View Full
                  </button>
                  <button
                    className="text-sm text-red-600 underline"
                    onClick={() => handleDelete(res._id)}
                  >
                    Delete
                  </button>

                  <button
                    className="text-sm text-gray-700 underline"
                    onClick={() => downloadResume(res.resume, 'pdf')}
                  >
                    PDF
                  </button>
                  <button
                    className="text-sm text-gray-700 underline"
                    onClick={() => downloadResume(res.resume, 'txt')}
                  >
                    TXT
                  </button>
                  <button
                    className="text-sm text-gray-700 underline"
                    onClick={() => downloadResume(res.resume, 'docx')}
                  >
                    DOCX
                  </button>
                </div>
                </div>
              ))}
            </div>
          )}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded max-w-3xl w-full shadow-lg">
                <h2 className="text-lg font-bold mb-4">Full Resume</h2>
                <div className="max-h-[70vh] overflow-y-auto border p-4 bg-gray-100 dark:bg-gray-900 text-sm whitespace-pre-wrap">
                  {selectedResume}
                </div>
                <div className="mt-4 text-right">
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {showRenameModal && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded max-w-md w-full shadow-lg">
                <h2 className="text-lg font-bold mb-4">Rename Tag</h2>

                <label className="block text-sm font-medium mb-2">Select New Tag:</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                >
                  <option>SWE Intern</option>
                  <option>Data Analyst</option>
                  <option>ML Research Intern</option>
                  <option>Product Intern</option>
                </select>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowRenameModal(false)}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("http://localhost:5000/rename-tag", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId,
                            oldTag: tagToRename,
                            newTag,
                            resumeId: resumeIdToRename
                          }),
                        });

                        const data = await res.json();
                        toast.success(data.message || "Tag updated!");
                        // Refresh saved resumes
                        const refreshed = await fetch(`http://localhost:5000/resumes/${userId}`);
                        const updated = await refreshed.json();
                        setSavedResumes(updated.resumes);

                        setShowRenameModal(false);
                      } catch (err) {
                        toast.error("Failed to save resume");

                        console.error(err);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'analyze' && (
          <>
            <div className="w-full space-y-4 px-4 sm:px-6">
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
        {savedResumes.length > 0 && (
          <div className="mb-2">
                  <label className="block font-medium mb-1">Use a saved resume as starting point:</label>
                  <select
                    onChange={(e) => {
                      const selectedContent = e.target.value;
                      try {
                        const parsed = JSON.parse(selectedContent);
                        setFormData((prev) => ({
                          ...prev,
                          ...parsed
                        }));
                      } catch {
                        setFormData((prev) => ({
                          ...prev,
                          education: selectedContent,
                          experience: selectedContent,
                          skills: selectedContent
                        }));
                      }
                    }}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a resume</option>
                    {savedResumes.map((r) => (
                      <option key={r._id} value={r.resume}>{r.tag}</option>
                    ))}
                  </select>
                </div>
              )}
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
          <div className="mb-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={formData.includeGPA}
                onChange={(e) =>
                  setFormData({ ...formData, includeGPA: e.target.checked })
                }
              />
              Include GPA
            </label>
          </div>

          <div className="mb-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={formData.skillsFirst}
                onChange={(e) =>
                  setFormData({ ...formData, skillsFirst: e.target.checked })
                }
              />
              Skills First Layout
            </label>
          </div>
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
              <div className="mt-6">
                <label className="block font-medium mb-1 mt-4">Save with Tag (e.g., SWE-May, No-GPA):</label>
                <input
                type="text"
                value={resumeTag}
                onChange={(e) => setResumeTag(e.target.value)}
                placeholder="Enter tag for this version"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                />
                <label className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={overwriteConfirmed}
                    onChange={(e) => setOverwriteConfirmed(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="text-sm">Overwrite if this tag already exists</span>
                </label>
                <button
                  onClick={async () => {
                    if (!resumeTag.trim()) {
                      toast.error("Please enter a tag");
                      return;
                    }

                    try {
                      const checkRes = await fetch(`http://localhost:5000/check-tag`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId, tag: resumeTag })
                      });

                      const checkData = await checkRes.json();

                      if (checkData.exists && !overwriteConfirmed) {
                          toast.error("This tag already exists, please check the box to overwrite");
                          return;
                        }
                      const res = await fetch("http://localhost:5000/save-resume", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          resume: editableResume,
                          userId,
                          name: formData.name,
                          email: formData.email,
                          tag: resumeTag
                        }),
                      });

                      const data = await res.json();
                      toast.success(data.message || "Saved!");
                    } catch (err) {
                      toast.error("Failed to save resume");
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded"
                >
                  Save to My Resumes
                </button>
              </div>
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
          {savedResumes.length > 0 && (
            <div className="mb-2">
              <label className="block font-medium mb-1">Use a saved resume:</label>
              <select
                onChange={(e) => setResumeForATS(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a resume</option>
                {savedResumes.map((r) => (
                  <option key={r._id} value={r.resume}>{r.tag}</option>
                ))}
              </select>
            </div>
          )}
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
            {atsResult.text && (
              <>
                <div className="mt-6 p-4 border bg-red-50 rounded text-sm">
                  <h3 className="font-bold text-red-700 mb-2">⚠️ Missing Keywords</h3>
                  <ul className="list-disc pl-5 text-red-600">
                    {atsResult.text
                      .split('\n')
                      .filter(line =>
                        line.toLowerCase().includes("missing keyword") ||
                        line.toLowerCase().includes("missing:") ||
                        line.toLowerCase().includes("skills missing")
                      )
                      .map((line, idx) => (
                        <li key={idx}>{line.replace(/[-•*]/g, '').trim()}</li>
                      ))}
                  </ul>
                </div>
                <div className="mt-6 whitespace-pre-wrap">
                  {atsResult.text}
                </div>
              </>
            )}

          </div>
        )}
        </>
      )}

      {activeTab === 'match' && (
        <>
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold">Job Match Evaluation</h2>
              {savedResumes.length > 0 && (
                <div className="mb-2">
                  <label className="block font-medium mb-1">Use a saved resume:</label>
                  <select
                    onChange={(e) => setMatchResume(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a resume</option>
                    {savedResumes.map((r) => (
                      <option key={r._id} value={r.resume}>{r.tag}</option>
                    ))}
                  </select>
                </div>
              )}
            <label className="block font-medium">Paste Resume:</label>
            <textarea
              rows={10}
              className="w-full p-3 border rounded"
              value={matchResume}
              onChange={(e) => setMatchResume(e.target.value)}
              placeholder="Paste your resume here"
            />

            <label className="block font-medium mt-4">Paste Job Description:</label>
            <textarea
              rows={10}
              className="w-full p-3 border rounded"
              value={matchJob}
              onChange={(e) => setMatchJob(e.target.value)}
              placeholder="Paste job description here"
            />

            <button
              onClick={handleMatchScore}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded"
            >
              Evaluate Match
            </button>

            {matchResult && (
              <div className="mt-6 border p-4 rounded bg-purple-50 whitespace-pre-wrap text-sm">
                <strong>Result:</strong>
                <div className="mt-2">{matchResult}</div>
                {matchResult.toLowerCase().includes("score:") &&
                  parseInt((matchResult.match(/score:\s*(\d+)/i) || [])[1])>= autoApplySettings.minMatchScore && (
                    <button
                      onClick={() =>
                        applyToJob({
                          title: "Matched Job",
                          company: "Company Name",
                          description: matchJob,
                          location: "Remote",
                          matchScore: parseInt(matchResult.match(/\d+/)),
                          requirements: [],
                          jobBoard: "manual",
                          id: `match-${Date.now()}`
                        }, editableResume)
                      }
                      className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Apply with Current Resume
                    </button>
                  )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
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
                Upload Resume
              </button>
            </div>
            <div>
              <label className="block font-medium mb-1">Paste Your Resume:</label>
              <textarea
                value={resumeForATS}
                onChange={(e) => setResumeForATS(e.target.value)}
                rows={6}
                className="w-full p-3 border rounded resize-y"
                placeholder="Paste your resume here..."
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Paste Job Description:</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                className="w-full p-3 border rounded resize-y"
                placeholder="Paste the job description..."
              />
            </div>

            <button
              onClick={handleRewriteResume}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-2 rounded"
            >
              Rewrite Resume to Match Job
            </button>
          </div>

          {editableResume && (
            <div className="mt-6">
              <label className="block font-semibold mb-2">Rewritten Resume:</label>
              <textarea
                value={editableResume}
                onChange={(e) => setEditableResume(e.target.value)}
                rows={20}
                className="w-full p-4 border rounded resize-y font-mono text-sm"
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'feedback' && (
        <div className="max-w-xl mx-auto mt-8 space-y-4">
          <h2 className="text-2xl font-bold mb-4">We’d love your feedback!</h2>
          <input
            type="text"
            placeholder="Your name (optional)"
            className="w-full p-2 border rounded"
            value={feedbackName}
            onChange={(e) => setFeedbackName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            className="w-full p-2 border rounded"
            value={feedbackEmail}
            onChange={(e) => setFeedbackEmail(e.target.value)}
          />
          <select
            className="w-full p-2 border rounded"
            value={feedbackCategory}
            onChange={(e) => setFeedbackCategory(e.target.value)}
          >
            <option value="">Select category</option>
            <option value="Bug">Bug</option>
            <option value="Feature Request">Feature Request</option>
            <option value="General">General</option>
          </select>
          <textarea
            placeholder="Your message"
            className="w-full p-3 border rounded resize-y"
            rows={5}
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
          />
          <button
            onClick={handleSubmitFeedback}
            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-2 rounded"
          >
            Submit Feedback
          </button>
        </div>
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
      <footer className="text-center text-sm text-gray-500 mt-10 pb-4 flex justify-center items-center gap-4">
  <span>
    © {new Date().getFullYear()} Built by Sashank.R.K.
  </span>
  <a
    href="https://github.com/Sashank006"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 hover:text-black dark:hover:text-white"
  >
    <Github className="w-4 h-4" /> GitHub
  </a>
  <a
    href="https://www.linkedin.com/in/sashankreddyk"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 text-blue-600 hover:underline"
  >
    <Linkedin className="w-4 h-4" /> LinkedIn
  </a>
</footer>
    </div>
  ) 
}
export default App;



