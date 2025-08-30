from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import requests
from pymongo import MongoClient
from datetime import datetime
import bcrypt
from flask import request, jsonify
from datetime import datetime , timezone
from pymongo import UpdateOne
import os
mongo_client = MongoClient(os.environ.get("MONGO_URI"))
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
db = mongo_client['resumeAI']  
users_collection = db['users']
resumes_collection = db['resumes']
applied_jobs_collection = db['applied_jobs']
feedback_collection = db['feedback']
app = Flask(__name__)
CORS(app)
from bson.objectid import ObjectId
from flask import send_file
import PyPDF2
import io

@app.route('/rewrite-resume', methods=['POST'])
def rewrite_resume():
    data = request.get_json()
    resume = data.get("resume", "")
    job_description = data.get("job", "")

    prompt = f"""
You are a professional resume writer. Improve the following resume to better match the job description below.

Resume:
{resume}

Job Description:
{job_description}

Goals:
- Tailor language to match the job
- Emphasize relevant skills and responsibilities
- Maintain clean formatting
- Avoid copying the job description verbatim

Rewrite and return only the revised resume:
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You specialize in optimizing resumes to match job descriptions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        rewritten = response.choices[0].message.content
        return jsonify({"rewritten": rewritten})
    except Exception as e:
        print("Rewrite error:", e)
        return jsonify({"rewritten": "Error rewriting resume."}), 500

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return jsonify({"text": text})
    except Exception as e:
        print("PDF extraction error:", e)
        return jsonify({"error": "Failed to extract text"}), 500

@app.route('/resumes/<user_id>', methods=['GET'])
def get_resumes(user_id):
    try:
        
        resumes = list(resumes_collection.find({"userId": user_id}))
        
     
        for resume in resumes:
            resume['_id'] = str(resume['_id'])
        
        return jsonify({"resumes": resumes}), 200

    except Exception as e:
        print("Resume fetch error:", e)
        return jsonify({"error": "Failed to retrieve resumes"}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        resume_text = data.get("resume", "")
         
        print(f"API Key exists: {bool(os.getenv('OPENAI_API_KEY'))}")
        print(f"Resume text length: {len(resume_text)}")

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", 
            messages=[
                {"role": "system", "content": "You are an expert resume reviewer. Give bullet-point feedback."},
                {"role": "user", "content": f"Review this resume and give 4–6 bullet points:\n\n{resume_text}"}
            ],
            max_tokens=500,  
            temperature=0.7  
        )
        
        feedback = response.choices[0].message.content
        return jsonify({"feedback": feedback})
        
    except Exception as e:
        print(f"Full error details: {type(e).__name__}: {str(e)}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500
    
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "openai_key_present": bool(os.getenv('OPENAI_API_KEY'))
    })

@app.route('/generate', methods=['POST'])
def generate_resume():
    data = request.get_json()

    name = data.get("name", "")
    email = data.get("email", "")
    education = data.get("education", "")
    experience = data.get("experience", "")
    skills = data.get("skills", "")
    include_gpa = data.get("includeGPA", False)
    skills_first = data.get("skillsFirst", False)
    user_id = data.get("userId")
    role = data.get("role", "")
    layout_order = (
    f"Skills\n{skills}\n\nExperience\n{experience}"
    if skills_first else
    f"Experience\n{experience}\n\nSkills\n{skills}"
    )

    gpa_text = "Include GPA if mentioned in the education section." if include_gpa else "Do not mention GPA unless it's explicitly included."

    prompt = f"""
You are a professional resume writer. Generate a clean, ATS-friendly resume tailored for the role of {role}.

Name: {name}
Email: {email}

Education:
{education}

{gpa_text}

{layout_order}

Use professional language. Include these sections:
- Summary (for a {role})
- Education
- {('Skills first' if skills_first else 'Experience first')} layout as specified
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional resume writer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        generated_resume = response.choices[0].message.content

        if user_id:
            resumes_collection.insert_one({
                "userId": user_id,
                "resume": generated_resume,
                "metadata": {
                    "name": name,
                    "email": email,
                    "createdAt": datetime.now(timezone.utc)
                }
            })

        return jsonify({"generated": generated_resume})

    except Exception as e:
        print("Resume generation error:", e)
        return jsonify({"generated": "Error generating resume."}), 500

@app.route('/ats-score', methods=['POST'])
def ats_score():
    data = request.get_json()
    resume = data.get("resume", "")
    job_description = data.get("job", "")

    prompt = f"""
Compare the following resume and job description. Provide:

1. An ATS match score out of 100 based on keyword and role relevance.
2. A list of at least 5 important keywords missing from the resume.
3. 3–4 bullet point suggestions for improving this resume to better match the job.

--- Resume ---
{resume}

--- Job Description ---
{job_description}
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a hiring system that evaluates resumes based on ATS compatibility."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.5
        )

        ats_feedback = response.choices[0].message.content
        return jsonify({"result": ats_feedback})
    except Exception as e:
        print("ATS score error:", e)
        return jsonify({"result": "Error evaluating ATS score."}), 500
    
@app.route('/test-db')
def test_db():
    try:
        users_collection.insert_one({"test": "working"})
        return jsonify({"message": "MongoDB connected successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})
    
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    users_collection.insert_one({
        "email": email,
        "password": hashed
    })

    return jsonify({"message": "User registered successfully"}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({
                        "message": "Login successful",
                        "userId": str(user['_id']),
                        "email": user['email']
                    }), 200
    else:
        return jsonify({"error": "Incorrect password"}), 401
    
@app.route('/extract-fields', methods=['POST'])
def extract_fields():
    data = request.get_json()
    resume_text = data.get("resume", "")

    prompt = f"""
Extract the following information from this resume:

1. Full Name
2. Email Address
3. Education details
4. Work experience
5. Skills

Respond strictly in this JSON format:
{{
  "name": "...",
  "email": "...",
  "education": "...",
  "experience": "...",
  "skills": "..."
}}

Resume:
{resume_text}
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a resume parsing assistant. Always respond in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        extracted = response.choices[0].message.content
        return jsonify({"fields": extracted})
    except Exception as e:
        print("Extraction error:", e)
        return jsonify({"error": "Failed to extract fields."}), 500

@app.route('/save-resume', methods=['POST'])
def save_resume():
    data = request.get_json()
    resume_text = data.get("resume", "")
    user_id = data.get("userId", "")
    name = data.get("name", "")
    email = data.get("email", "")
    tag = data.get("tag", "")  

    if not resume_text or not user_id or not tag:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        result = resumes_collection.update_one(
            {
                "userId": user_id,
                "metadata.tag": tag
            },
            {
                "$set": {
                    "resume": resume_text,
                    "metadata": {
                        "name": name,
                        "email": email,
                        "tag": tag,
                        "userId": user_id,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            }
        )
        if result.matched_count:
            return jsonify({"message": "Resume updated!"}), 200
        else:
            # If no match, insert a new resume
            resumes_collection.insert_one({
                "userId": user_id,
                "resume": resume_text,
                "metadata": {
                    "name": name,
                    "email": email,
                    "tag": tag,
                    "createdAt": datetime.now(timezone.utc)
                }
            })
            return jsonify({"message": "Resume saved!"}), 200

    except Exception as e:
        print("Save resume error:", e)
        return jsonify({"error": "Failed to save resume"}), 500
    
@app.route('/check-tag', methods=['POST'])
def check_tag():
    data = request.get_json()
    user_id = data.get("userId")
    tag = data.get("tag")

    if not user_id or not tag:
        return jsonify({"error": "Missing fields"}), 400

    exists = resumes_collection.find_one({"userId": user_id, "metadata.tag": tag})
    return jsonify({"exists": bool(exists)}), 200

@app.route('/rename-tag', methods=['POST'])
def rename_tag():
    data = request.get_json()
    user_id = data.get("userId")
    resume_id = data.get("resumeId")
    new_tag = data.get("newTag")

    result = resumes_collection.update_one(
        {"_id": ObjectId(resume_id), "userId": user_id},
        {"$set": {"metadata.tag": new_tag}}
    )

    return jsonify({"message": "Tag renamed successfully"})

@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    name = data.get("name", "")
    email = data.get("email", "")
    message = data.get("message", "")
    category = data.get("category", "")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    feedback_collection.insert_one({
        "name": name,
        "email": email,
        "category": category,
        "message": message,
        "createdAt": datetime.now(timezone.utc)
    })

    return jsonify({"message": "Feedback submitted!"}), 200

@app.route("/save-applied-job", methods=["POST"])
def save_applied_job():
    data = request.json
    user_id = data.get("userId")
    job = data.get("job")

    if not user_id or not job:
        return jsonify({"error": "Missing userId or job"}), 400

    job_with_user = {**job, "userId": user_id, "appliedAt": datetime.now(timezone.utc)}
    applied_jobs_collection.insert_one(job_with_user)

    return jsonify({"message": "Job saved"}), 200

@app.route("/applied-jobs/<user_id>", methods=["GET"])
def get_applied_jobs(user_id):
    try:
        applied_jobs = list(applied_jobs_collection.find({"userId": user_id}))
        for job in applied_jobs:
            job["_id"] = str(job["_id"])
        return jsonify({"appliedJobs": applied_jobs}), 200
    except Exception as e:
        print("Error fetching applied jobs:", e)
        return jsonify({"error": "Something went wrong"}), 500

@app.route('/generate-cover-letter', methods=['POST'])
def generate_cover_letter():
    data = request.get_json()
    resume = data.get("resume", "")
    job_title = data.get("jobTitle", "")
    job_description = data.get("jobDescription", "")

    prompt = f"""
You are a professional career assistant. Write a personalized cover letter tailored to the job title and description below.

Resume:
{resume}

Job Title: {job_title}

Job Description:
{job_description}

Write a compelling, professional cover letter starting with 'Dear Hiring Manager'. Highlight relevant strengths and show alignment with the job.
Return only the final formatted cover letter.
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional cover letter writer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        letter = response.choices[0].message.content
        return jsonify({"coverLetter": letter})

    except Exception as e:
        print("Cover letter generation error:", e)
        return jsonify({"coverLetter": "Error generating cover letter."}), 500

if __name__ == "__main__":
   app.run(host="0.0.0.0", port=5000)