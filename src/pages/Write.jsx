import React, { useEffect, useState } from "react";
import { FaImage } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import app from "../firebase";
import axios from "axios";
import jwt_decode from "jwt-decode";
import { useNavigate } from "react-router-dom";

const categories = [
  "sport",
  "food",
  "technology",
  "travelling",
  "otomotif",
  "selebrity",
  "gaming",
];

const Write = () => {
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [expire, setExpire] = useState("");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState([]);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState("");
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    refreshToken();
    if (user === null) {
      navigate("/");
    }
  }, [user]);

  const loadImage = (e) => {
    const image = e.target.files[0];
    setFile(image);
    setPreview(URL.createObjectURL(image));
  };

  const handleCat = (e) => {
    const value = e.target.value;
    const currentIndex = cat.indexOf(value);
    const newCheckboxes = [...cat];

    if (currentIndex === -1) {
      newCheckboxes.push(value);
    } else {
      newCheckboxes.splice(currentIndex, 1);
    }

    setCat(newCheckboxes);
  };

  const refreshToken = async () => {
    try {
      const response = await axios.get("http://localhost:5000/token");
      setToken(response.data.accessToken);
      const decoded = jwt_decode(response.data.accessToken);
      setExpire(decoded.exp);
    } catch (error) {
      console.log(error);
    }
  };
  const axiosJWT = axios.create();

  axiosJWT.interceptors.request.use(
    async (config) => {
      const currentDate = new Date();
      if (expire * 1000 < currentDate.getTime()) {
        await refreshToken();
      }
      config.headers.Authorization = `Bearer ${token}`;

      return config;
    },
    (error) => {
      console.log(error);
      return Promise.reject(error);
    }
  );
  const handleClick = (e) => {
    e.preventDefault();
    const fileName = new Date().getTime() + file.name;
    const storage = getStorage(app);
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Register three observers:
    // 1. 'state_changed' observer, called any time the state changes
    // 2. Error observer, called on failure
    // 3. Completion observer, called on successful completion
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        switch (snapshot.state) {
          case "paused":
            console.log("Upload is paused");
            break;
          case "running":
            console.log("Upload is running");
            break;
          default:
        }
      },
      (error) => {
        // Handle unsuccessful uploads
      },
      () => {
        // Handle successful uploads on complete
        // For instance, get the download URL: https://firebasestorage.googleapis.com/...
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          const postContent = async () => {
            try {
              const post = {
                title,
                content,
                img: downloadURL,
                categories: cat,
                userId: user,
              };
              const response = await axiosJWT.post(
                `http://localhost:5000/posts`,
                post,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              console.log(post);
              navigate("/");
            } catch (error) {
              setError(error.response.data);
              console.log(error);
            }
          };
          postContent();
        });
      }
    );
  };

  return (
    <>
      <Navbar />
      <div className="w-full justify-center flex flex-wrap py-20">
        <div className="flex w-4/5 py-3">
          <span className="text-xl font-semibold">Add New Article</span>
        </div>
        <div className="flex justify-center h-5">
          {error && <span className="text-red-500">{error}</span>}
        </div>
        <div className="w-full flex justify-center">
          <div className=" w-4/5 flex gap-5">
            <div className="flex-[3]">
              <input
                type="text"
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg border-gray-400 p-2 mb-2 shadow-lg"
                placeholder="Title"
              />
              <div className="rounded-lg  h-72 ">
                <ReactQuill
                  theme="snow"
                  onChange={setContent}
                  className="h-full border-none "
                />
                <div className="pt-12 flex w-full justify-center items-center">
                  <div onClick={handleClick} className="btn">
                    Upload
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full p-5 border-gray-400 border rounded-lg shadow-lg">
              <div className="flex flex-col justify-center w-full  rounded-lg">
                <input
                  type="file"
                  onChange={loadImage}
                  id="img"
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="img"
                  className=" w-full flex flex-col  justify-center"
                >
                  <div className="flex  justify-center w-full">
                    {preview ? (
                      <figure className="w-full pb-2">
                        <img src={preview} alt="preview image" />
                      </figure>
                    ) : (
                      <FaImage className="w-1/2 h-1/2 pb-5  text-gray-500" />
                    )}
                  </div>
                  <div className="btn btn-sm flex  gap-2">
                    <FaImage /> <span>Add picture</span>
                  </div>
                </label>
              </div>
              <div className="w-full border-gray-400 border-t mt-3">
                <span className="font-medium text-lg">Category</span>
                <div className="sm:col-span-2  grid grid-cols-2">
                  {categories.map((cat, index) => (
                    <div
                      className="relative mt-2.5 flex items-center"
                      key={index}
                    >
                      <input
                        type="checkbox"
                        onChange={handleCat}
                        value={cat}
                        multiple
                        name="categories"
                        id="categories"
                        className="checkbox "
                      />
                      <label className="p-1">{cat}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Write;
