"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

export default function FilesPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [fileList, setFileList] = useState<FTPFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/ftp/getfiles/${sessionId}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch files or unauthorized");
      }

      const data = await response.json();
      setFileList(data.files);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setError("Unable to load files. Please authenticate again.");
      setFileList([]);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    fetchFiles();

    const intervalId = setInterval(fetchFiles, 1000);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  const handleFolderClick = async (folderName: string) => {
    try {
      const response = await fetch(`/api/ftp/listfiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderName, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch folder contents");
      }

      const data = await response.json();
      router.push(`/files/${data.sessionId}`);
    } catch (error: any) {
      console.error("Error fetching folder:", error);
      setError(error.message || "Failed to load folder contents.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);

      const response = await fetch(`/api/ftp/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setError(error.message || "Failed to upload file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const response = await fetch(`/api/ftp/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, fileName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete file");
      }
    } catch (error: any) {
      console.error("Error deleting file:", error);
      setError(error.message || "Failed to delete file");
    }
  };

  const handleReadFile = async (fileName: string) => {
    try {
      const response = await fetch(`/api/ftp/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, fileName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to read file");
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType?.includes("text")) {
        const text = await response.text();
        setFileContent(text);
        setSelectedFile(fileName);
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error("Error reading file:", error);
      setError(error.message || "Failed to read file");
    }
  };

  const closeModal = () => {
    setFileContent(null);
    setSelectedFile(null);
  };

  if (!sessionId) {
    return <div>No session provided in the URL.</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!fileList) {
    return <div>Loading files...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Files List</h1>
      <div className="mb-4">
        <label htmlFor="file-upload" className="mr-2">Upload File:</label>
        <input
          id="file-upload"
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="border p-1"
        />
      </div>
      {fileList.length === 0 ? (
        <p>No files or folders found.</p>
      ) : (
        <ul className="space-y-2">
          {fileList.map((file, index) => (
            <li
              key={index}
              className={`p-2 rounded flex items-center justify-between gap-2 ${file.type === 2 ? "bg-blue-100 cursor-pointer" : "bg-gray-100"}`}
            >
              <div className="flex items-center gap-2" onClick={file.type === 2 ? () => handleFolderClick(file.name) : undefined}>
                {file.type === 2 ? (
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 0 00-2-2h-6l-2-2H5a2 0 00-2 2z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 0 00-2 2v14a2 2 0 002 2z"
                    ></path>
                  </svg>
                )}
                <div>
                  <strong>{file.name}</strong>
                  {file.type === 1 && (
                    <span className="ml-2 text-sm text-gray-600">
                      - {file.size} bytes
                    </span>
                  )}
                </div>
              </div>
              {file.type === 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReadFile(file.name)}
                    className="text-blue-500 hover:underline"
                  >
                    Read
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.name)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {fileContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded max-w-2xl max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-2">{selectedFile}</h2>
            <pre className="whitespace-pre-wrap">{fileContent}</pre>
            <button
              onClick={closeModal}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}