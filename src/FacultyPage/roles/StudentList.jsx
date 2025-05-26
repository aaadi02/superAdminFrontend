import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function StudentList() {
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("admission");
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [subcastes, setSubcastes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState("");
  const [backlogModal, setBacklogModal] = useState({
    open: false,
    studentId: null,
    student: null,
    streamId: "",
    departmentId: "",
    semesterId: "",
    semesterSubjects: [],
  });
  const [modalError, setModalError] = useState(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [semesters, setSemesters] = useState([]);
  // New state for certificate modal
  const [certificateModal, setCertificateModal] = useState({
    open: false,
    studentId: null,
    type: "", // 'TC' or 'LC'
    reason: "",
    leavingDate: "",
    isCleared: true,
    completionStatus: "", // For LC
    error: null,
  });
  const navigate = useNavigate();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const query = admissionTypeFilter
        ? `?admissionType=${admissionTypeFilter}`
        : "";
      const res = await axios.get(
        `http://localhost:5000/api/students${query}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        }
      );
      setStudents(res.data);
      setFetchError(null);
    } catch (err) {
      console.error("Error fetching students:", err);
      setFetchError(err.response?.data?.error || "Failed to fetch students.");
    } finally {
      setLoading(false);
    }
  }, [admissionTypeFilter]);

  useEffect(() => {
    fetchStudents();

    // Fetch semesters for the backlog modal
    const fetchSemesters = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/superadmin/semesters",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
            },
          }
        );
        setSemesters(res.data || []);
      } catch (err) {
        console.error("Failed to fetch semesters:", err);
      }
    };

    fetchSemesters();
  }, [fetchStudents]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAdmissionTypeFilterChange = (e) => {
    setAdmissionTypeFilter(e.target.value);
  };

  const handleEdit = (student) => {
    console.log("Editing student:", student);
    setEditingId(student._id);
    setFormData(student);
    navigate("/dashboard/admission", {
      state: student,
    });
  };

  const filteredStudents = students.filter(
    (student) =>
      student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollmentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        await axios.delete(`http://localhost:5000/api/students/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        });
        fetchStudents();
        alert("Student deleted successfully!");
      } catch (err) {
        alert("Error deleting student: " + err.message);
      }
    }
  };

  const handlePromote = async (id) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/students/promote/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        }
      );
      alert(response.data.message || "Student promoted successfully");
      fetchStudents();
    } catch (err) {
      alert(
        "Error promoting student: " + (err.response?.data?.error || err.message)
      );
    }
  };

  // Open certificate modal
  const openCertificateModal = (studentId, type) => {
    setCertificateModal({
      open: true,
      studentId,
      type,
      reason: "",
      leavingDate: new Date().toISOString().split("T")[0], // Default to today
      isCleared: true,
      completionStatus: type === "LC" ? "Completed" : "",
      error: null,
    });
  };

  // Close certificate modal
  const closeCertificateModal = () => {
    setCertificateModal({
      open: false,
      studentId: null,
      type: "",
      reason: "",
      leavingDate: "",
      isCleared: true,
      completionStatus: "",
      error: null,
    });
  };

  // Handle certificate form input changes
  const handleCertificateInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCertificateModal((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      error: null,
    }));
  };

  // Generate TC or LC
  const handleGenerateCertificate = async () => {
    const {
      studentId,
      type,
      reason,
      leavingDate,
      isCleared,
      completionStatus,
    } = certificateModal;

    // Validate inputs
    if (!reason.trim()) {
      setCertificateModal((prev) => ({ ...prev, error: "Reason is required" }));
      return;
    }
    if (!leavingDate) {
      setCertificateModal((prev) => ({
        ...prev,
        error: "Leaving date is required",
      }));
      return;
    }
    if (type === "LC" && !completionStatus) {
      setCertificateModal((prev) => ({
        ...prev,
        error: "Completion status is required for Leaving Certificate",
      }));
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/students/generate-certificate/${studentId}`,
        {
          type,
          reason,
          leavingDate,
          isCleared,
          ...(type === "LC" && { completionStatus }),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
          responseType: "blob", // Expect binary PDF response
        }
      );

      // Create a blob URL for the PDF and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}_${studentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`${type} generated successfully!`);
      closeCertificateModal();
    } catch (err) {
      let errorMessage = "Failed to generate certificate. Please try again.";
      if (err.response?.status === 404) {
        errorMessage =
          "Certificate generation endpoint not found. Please contact the administrator.";
      } else if (err.response?.status === 400) {
        // Parse error message from response if available
        const text = await new Response(err.response.data).text();
        try {
          const json = JSON.parse(text);
          errorMessage = json.error || errorMessage;
        } catch (e) {
          errorMessage = text || errorMessage;
        }
      } else if (err.response?.status === 500) {
        errorMessage =
          "Server error while generating certificate. Please try again later.";
      }
      setCertificateModal((prev) => ({ ...prev, error: errorMessage }));
      console.error(`${type} generation error:`, err);
    }
  };

  const openBacklogModal = async (studentId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/students/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        }
      );
      const student = res.data;
      const semesterId = student.semester?._id || "";
      let semesterSubjects = [];
      if (semesterId && student.department?._id) {
        try {
          const subjectsRes = await axios.get(
            `http://localhost:5000/api/students/subjects/${semesterId}/${student.department._id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }
          );
          semesterSubjects = subjectsRes.data;
        } catch (err) {
          console.error("Failed to fetch subjects:", err);
          setModalError("Failed to fetch subjects for the selected semester.");
        }
      }
      setBacklogModal({
        open: true,
        studentId,
        student,
        streamId: student.stream?._id || "",
        departmentId: student.department?._id || "",
        semesterId,
        semesterSubjects,
      });
      setModalError(
        semesterSubjects.length === 0 && semesterId
          ? "No subjects available for this semester."
          : null
      );
    } catch (err) {
      alert(
        "Error fetching student data: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  const closeBacklogModal = () => {
    setBacklogModal({
      open: false,
      studentId: null,
      student: null,
      streamId: "",
      departmentId: "",
      semesterId: "",
      semesterSubjects: [],
    });
    setModalError(null);
    setLoadingSubjects(false);
  };

  const handleBacklogSemesterChange = async (e) => {
    const semesterId = e.target.value;
    setBacklogModal((prev) => ({ ...prev, semesterId, semesterSubjects: [] }));
    setModalError(null);
    setLoadingSubjects(true);

    if (semesterId && backlogModal.departmentId) {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/students/subjects/${semesterId}/${backlogModal.departmentId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
            },
          }
        );
        if (res.data.length === 0) {
          setModalError(
            "No subjects available for this semester and department."
          );
        }
        setBacklogModal((prev) => ({ ...prev, semesterSubjects: res.data }));
      } catch (err) {
        setModalError(
          "Failed to fetch subjects: " +
            (err.response?.data?.error || err.message)
        );
      } finally {
        setLoadingSubjects(false);
      }
    } else {
      setLoadingSubjects(false);
    }
  };

  const handleSubjectStatusUpdate = async (subjectId, status) => {
    const { studentId, student, semesterId } = backlogModal;
    if (!semesterId) {
      setModalError("Please select a semester.");
      return;
    }

    // Verify subjectId is valid for the semester
    const isValidSubject = backlogModal.semesterSubjects.some(
      (sub) => sub._id === subjectId
    );
    if (!isValidSubject) {
      setModalError("Invalid subject selected for this semester.");
      return;
    }

    try {
      // Find the semester record for the selected semester
      const semesterRecord = student.semesterRecords.find(
        (record) =>
          record.semester?._id && String(record.semester._id) === semesterId
      );

      // Update semesterRecords
      const updatedSemesterRecords = [...student.semesterRecords];
      if (semesterRecord) {
        const subjectIndex = semesterRecord.subjects.findIndex(
          (sub) => sub.subject?._id && String(sub.subject._id) === subjectId
        );
        if (subjectIndex >= 0) {
          semesterRecord.subjects[subjectIndex].status = status;
          semesterRecord.subjects[subjectIndex].marks =
            status === "Passed" ? 50 : 0;
        } else {
          semesterRecord.subjects.push({
            subject: subjectId,
            status,
            marks: status === "Passed" ? 50 : 0,
          });
        }
      } else {
        updatedSemesterRecords.push({
          semester: semesterId,
          subjects: [
            { subject: subjectId, status, marks: status === "Passed" ? 50 : 0 },
          ],
          isBacklog: status === "Failed",
        });
      }

      // Handle backlogs
      if (status === "Failed") {
        const existingBacklog = student.backlogs.find(
          (backlog) =>
            backlog.subject?._id &&
            backlog.semester?._id &&
            String(backlog.subject._id) === subjectId &&
            String(backlog.semester._id) === semesterId
        );
        if (!existingBacklog) {
          await axios.post(
            `http://localhost:5000/api/students/${studentId}/add-backlog`,
            { subjectIds: [subjectId], semesterId },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }
          );
        }
      } else if (status === "Passed") {
        const backlog = student.backlogs.find(
          (backlog) =>
            backlog.subject?._id &&
            backlog.semester?._id &&
            String(backlog.subject._id) === subjectId &&
            String(backlog.semester._id) === semesterId
        );
        if (backlog) {
          await axios.put(
            `http://localhost:5000/api/students/${studentId}/update-backlog/${backlog._id}`,
            { status: "Cleared" },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
              },
            }
          );
        }
      }

      // Update student with new semesterRecords
      await axios.put(
        `http://localhost:5000/api/students/${studentId}`,
        { semesterRecords: updatedSemesterRecords },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        }
      );

      alert(`Subject status updated to ${status}!`);
      fetchStudents();
      const res = await axios.get(
        `http://localhost:5000/api/students/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("facultyToken")}`,
          },
        }
      );
      setBacklogModal((prev) => ({ ...prev, student: res.data }));
    } catch (err) {
      setModalError(
        err.response?.data?.error || "Failed to update subject status."
      );
    }
  };

  const getSubjectStatus = (subjectId, semesterId) => {
    const { student } = backlogModal;
    if (!student || !semesterId) return "Pending";
    const semesterRecord = student.semesterRecords.find(
      (record) =>
        record.semester?._id && String(record.semester._id) === semesterId
    );
    if (semesterRecord) {
      const subject = semesterRecord.subjects.find(
        (sub) => sub.subject?._id && String(sub.subject._id) === subjectId
      );
      return subject ? subject.status : "Pending";
    }
    return "Pending";
  };

  return (
    <div className="p-4 mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or enrollment number..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={admissionTypeFilter}
            onChange={handleAdmissionTypeFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Admission Types</option>
            <option value="Regular">Regular</option>
            <option value="Direct Second Year">Direct Second Year</option>
            <option value="Lateral Entry">Lateral Entry</option>
          </select>
        </div>
      </div>

      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <span>{fetchError}</span>
          <button
            onClick={fetchStudents}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading students...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No students found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcaste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admission Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admission Through
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stream
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.firstName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.enrollmentNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.casteCategory}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.subCaste}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.admissionType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.admissionThrough}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.stream ? student.stream.name : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.department ? student.department.name : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(student)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student._id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handlePromote(student._id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        Promote
                      </button>
                      <button
                        onClick={() => openBacklogModal(student._id)}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                      >
                        Backlog
                      </button>
                      <button
                        onClick={() => openCertificateModal(student._id, "TC")}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        TC
                      </button>
                      <button
                        onClick={() => openCertificateModal(student._id, "LC")}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                      >
                        LC
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Backlog Modal */}
      {backlogModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Manage Backlogs for {backlogModal.student?.firstName}{" "}
                {backlogModal.student?.lastName}
              </h3>

              {modalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stream
                  </label>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                    {backlogModal.student?.stream?.name || "N/A"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                    {backlogModal.student?.department?.name || "N/A"}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={backlogModal.semesterId}
                  onChange={handleBacklogSemesterChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Semester</option>
                  {semesters.map((semester) => (
                    <option key={semester._id} value={semester._id}>
                      Semester {semester.number}
                    </option>
                  ))}
                </select>
              </div>

              {backlogModal.semesterId && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjects
                  </label>
                  <div className="border border-gray-200 rounded-lg divide-y">
                    {loadingSubjects ? (
                      <div className="flex items-center justify-center h-20">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">
                          Loading subjects...
                        </span>
                      </div>
                    ) : backlogModal.semesterSubjects.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No subjects available for this semester
                      </div>
                    ) : (
                      backlogModal.semesterSubjects.map((subject) => {
                        const status = getSubjectStatus(
                          subject._id,
                          backlogModal.semesterId
                        );
                        return (
                          <div
                            key={subject._id}
                            className="p-3 hover:bg-gray-50"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-medium">
                                  {subject.name}
                                </span>
                                <span
                                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                    status === "Passed"
                                      ? "bg-green-100 text-green-800"
                                      : status === "Failed"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleSubjectStatusUpdate(
                                      subject._id,
                                      "Passed"
                                    )
                                  }
                                  disabled={status === "Passed"}
                                  className={`px-3 py-1 rounded text-sm font-medium ${
                                    status === "Passed"
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-green-100 text-green-700 hover:bg-green-200"
                                  }`}
                                >
                                  Pass
                                </button>
                                <button
                                  onClick={() =>
                                    handleSubjectStatusUpdate(
                                      subject._id,
                                      "Failed"
                                    )
                                  }
                                  disabled={status === "Failed"}
                                  className={`px-3 py-1 rounded text-sm font-medium ${
                                    status === "Failed"
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  Fail
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeBacklogModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certificateModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Generate{" "}
                {certificateModal.type === "TC"
                  ? "Transfer Certificate"
                  : "Leaving Certificate"}
              </h3>

              {certificateModal.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                  {certificateModal.error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Leaving
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={certificateModal.reason}
                    onChange={handleCertificateInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Transferring to another institution"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leaving Date
                  </label>
                  <input
                    type="date"
                    name="leavingDate"
                    value={certificateModal.leavingDate}
                    onChange={handleCertificateInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isCleared"
                      checked={certificateModal.isCleared}
                      onChange={handleCertificateInputChange}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      No Dues (Cleared)
                    </span>
                  </label>
                </div>

                {certificateModal.type === "LC" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Completion Status
                    </label>
                    <select
                      name="completionStatus"
                      value={certificateModal.completionStatus}
                      onChange={handleCertificateInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select status</option>
                      <option value="Completed">Completed</option>
                      <option value="Incomplete">Incomplete</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 gap-2">
                <button
                  onClick={closeCertificateModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateCertificate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentList;
