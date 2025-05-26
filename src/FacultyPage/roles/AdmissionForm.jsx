import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

function AdmissionForm() {
  const [castes, setCastes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const location = useLocation();
  const [formData, setFormData] = useState({});
  const [subcastes, setSubcastes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCastes, setLoadingCastes] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [combinedData, setCombinedData] = useState([]);
  const [streams, setStreams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (location?.state) {
      setFormData(location.state);
      setEditingId(location.state._id);
    }
  }, [location?.state]);

  useEffect(() => {
    const fetchCastes = async () => {
      setLoadingCastes(true);
      try {
        const res = await axios.get(
          "http://localhost:5000/api/superadmin/castes",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
            },
          }
        );
        setCastes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load castes:", err);
        setFetchError("Failed to load castes.");
      } finally {
        setLoadingCastes(false);
      }
    };
    fetchCastes();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streamRes, departmentRes, semesterRes, subjectRes] =
          await Promise.all([
            axios.get("http://localhost:5000/api/streams", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }),
            axios.get("http://localhost:5000/api/superadmin/departments", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }),
            axios.get("http://localhost:5000/api/superadmin/semesters", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }),
            axios.get("http://localhost:5000/api/superadmin/subjects", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }),
          ]);

        const streamsData = streamRes.data || [];
        const departmentsData = departmentRes.data || [];
        const semestersData = semesterRes.data || [];
        const subjectsData = subjectRes.data || [];

        setStreams(streamsData);
        setDepartments(departmentsData);
        setSemesters(semestersData);
        setSubjects(subjectsData);

        const combined = streamsData.map((stream) => {
          const streamDepartments = departmentsData
            .filter((dept) => dept?.stream?._id === stream._id)
            .map((dept) => {
              const deptSubjects = subjectsData.filter(
                (sub) => sub.department?._id === dept._id
              );
              return { ...dept, subjects: deptSubjects };
            });
          return { ...stream, departments: streamDepartments };
        });

        setCombinedData(combined);
      } catch (err) {
        console.error("❌ Failed to fetch academic data:", err);
        setFetchError("Failed to fetch academic data.");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchSemesterSubjects = async () => {
      if (formData.semester && formData.department) {
        setLoading(true);
        try {
          const res = await axios.get(
            `http://localhost:5000/api/students/subjects/${formData.semester}/${formData.department}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }
          );
          setCombinedData((prev) => {
            const stream = prev.find((s) => s._id === formData.stream);
            if (stream) {
              const dept = stream.departments.find(
                (d) => d._id === formData.department
              );
              if (dept) dept.subjects = res.data;
            }
            return [...prev];
          });
          setFormData((prev) => ({ ...prev, subjects: [] }));
        } catch (err) {
          console.error("Failed to fetch subjects:", err);
          setFetchError(
            "Failed to fetch subjects for the selected semester and department."
          );
        } finally {
          setLoading(false);
        }
      }
    };
    fetchSemesterSubjects();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const currentSubjects = Array.isArray(prev.subjects) ? prev.subjects : [];
      const selectedSubjects = checked
        ? [...currentSubjects, value]
        : currentSubjects.filter((subject) => subject !== value);
      return { ...prev, subjects: selectedSubjects };
    });
  };

  const handleCasteChange = (e) => {
    const casteName = e.target.value;
    const selectedCaste = castes.find((c) => c.name === casteName);
    setFormData((prev) => ({
      ...prev,
      casteCategory: casteName,
      subCaste: "",
    }));
    setSubcastes(selectedCaste?.subcastes || []);
  };

  const validateForm = () => {
    const requiredFields = [
      "firstName",
      "lastName",
      "mobileNumber",
      "gender",
      "casteCategory",
      "stream",
      "department",
      "semester",
      "admissionType",
    ];
    for (const field of requiredFields) {
      console.log("Field:", field, "Value:", formData[field]);
      if (!formData[field]) {
        alert(`Please fill out the ${field} field.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5000/api/students/${editingId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
            },
          }
        );
        alert("Student updated successfully!");
        setEditingId(null);
      } else {
        await axios.post("http://localhost:5000/api/students", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        });
        alert("Student saved successfully!");
      }
      setFormData({});
      setSubcastes([]);
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const DropdownGroup = ({ label, name, options }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">-- Select {label} --</option>
        {options.map((opt, i) => (
          <option key={i} value={opt._id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );

  const fields = [
    { label: "First Name", name: "firstName" },
    { label: "Middle Name", name: "middleName" },
    { label: "Last Name", name: "lastName" },
    { label: "Father Name", name: "fatherName" },
    { label: "Unicode Father Name", name: "unicodeFatherName" },
    { label: "Mother Name", name: "motherName" },
    { label: "Unicode Mother Name", name: "unicodeMotherName" },
    { label: "Unicode Name", name: "unicodeName" },
    { label: "Enrollment Number", name: "enrollmentNumber" },
    { label: "Mobile Number", name: "mobileNumber" },
    { label: "Email", name: "email" },
    { label: "Section", name: "section" },
    { label: "Remark", name: "remark" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <span>{fetchError}</span>
          <button
            onClick={() => setFetchError(null)}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields?.map(({ label, name }) => (
          <div key={name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              type="text"
              name={name}
              value={formData[name] || ""}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        ))}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stream
          </label>
          <select
            name="stream"
            value={formData.stream || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Stream</option>
            {combinedData.map((stream) => (
              <option key={stream._id} value={stream._id}>
                {stream.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            name="department"
            value={formData.department || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Department</option>
            {(
              combinedData.find((s) => s._id === formData.stream)
                ?.departments || []
            ).map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <DropdownGroup
          label="Semester"
          name="semester"
          options={semesters.map((s) => ({
            _id: s._id,
            name: s.number,
          }))}
        />

        <div className="mb-4 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subjects
          </label>
          <div className="p-3 border border-gray-300 rounded-md bg-gray-50 max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading subjects...</span>
              </div>
            ) : (
              (formData.stream && formData.department && formData.semester
                ? combinedData
                    .find((s) => s._id === formData.stream)
                    ?.departments.find(
                      (dept) => dept._id === formData.department
                    )?.subjects
                : []
              )?.map((sub) => (
                <div key={sub._id} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`subject-${sub._id}`}
                    name="subjects"
                    value={sub._id}
                    checked={
                      Array.isArray(formData.subjects) &&
                      formData.subjects.includes(sub._id)
                    }
                    onChange={handleCheckboxChange}
                    disabled={loading}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`subject-${sub._id}`}
                    className="ml-2 text-gray-700"
                  >
                    {sub.name}
                  </label>
                </div>
              )) || (
                <div className="text-gray-500 py-2">
                  No subjects available for this semester and department.
                </div>
              )
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Gender --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Transgender">Transgender</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caste Category
          </label>
          <select
            name="casteCategory"
            value={formData.casteCategory || ""}
            onChange={handleCasteChange}
            disabled={loadingCastes}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Caste --</option>
            {castes.map((c) => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sub Caste
          </label>
          <select
            name="subCaste"
            value={formData.subCaste || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Subcaste --</option>
            {subcastes.map((sub, i) => (
              <option key={i} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Type
          </label>
          <select
            name="admissionType"
            value={formData.admissionType || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select Admission Type --</option>
            <option value="Regular">Regular</option>
            <option value="Direct Second Year">Direct Second Year</option>
            <option value="Lateral Entry">Lateral Entry</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Through
          </label>
          <select
            name="admissionThrough"
            value={formData.admissionThrough || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select --</option>
            <option value="Entrance Exam">Entrance Exam</option>
            <option value="Quota">Quota</option>
            <option value="Management">Management</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : editingId ? (
            "Update Student"
          ) : (
            "Submit Admission"
          )}
        </button>
      </div>
    </div>
  );
}

export default AdmissionForm;
