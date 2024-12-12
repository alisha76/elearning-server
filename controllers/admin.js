import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { rm } from "fs";
import { promisify } from "util";
import fs from "fs";
import { User } from "../models/User.js";

export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, createdBy, duration, price } = req.body;

  const image = req.file;

  await Courses.create({
    title,
    description,
    category,
    createdBy,
    image: image?.path,
    duration,
    price,
  });

  res.status(201).json({
    message: "Course Created Successfully",
  });
});

export const addLectures = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  if (!course)
    return res.status(404).json({
      message: "No Course with this id",
    });

  const { title, description } = req.body;

  const file = req.file;

  const lecture = await Lecture.create({
    title,
    description,
    video: file?.path,
    course: course._id,
  });

  res.status(201).json({
    message: "Lecture Added",
    lecture,
  });
});

export const deleteLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  rm(lecture.video, () => {
    console.log("Video deleted");
  });

  await lecture.deleteOne();

  res.json({ message: "Lecture Deleted" });
});

const unlinkAsync = promisify(fs.unlink);

export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  const lectures = await Lecture.find({ course: course._id });

  await Promise.all(
    lectures.map(async (lecture) => {
      await unlinkAsync(lecture.video);
      console.log("video deleted");
    })
  );

  rm(course.image, () => {
    console.log("image deleted");
  });

  await Lecture.find({ course: req.params.id }).deleteMany();

  await course.deleteOne();

  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({
    message: "Course Deleted",
  });
});

export const getAllStats = TryCatch(async (req, res) => {
  const totalCoures = (await Courses.find()).length;
  const totalLectures = (await Lecture.find()).length;
  const totalUsers = (await User.find()).length;

  const stats = {
    totalCoures,
    totalLectures,
    totalUsers,
  };

  res.json({
    stats,
  });
});

export const getAllUser = TryCatch(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select(
    "-password"
  );

  res.json({ users });
});

export const updateRole = TryCatch(async (req, res) => {
  if (req.user.mainrole !== "superadmin")
    return res.status(403).json({
      message: "This endpoint is assign to superadmin",
    });
  const user = await User.findById(req.params.id);

  if (user.role === "user") {
    user.role = "admin";
    await user.save();

    return res.status(200).json({
      message: "Role updated to admin",
    });
  }

  if (user.role === "admin") {
    user.role = "user";
    await user.save();

    return res.status(200).json({
      message: "Role updated",
    });
  }
});

export const deleteUser  = TryCatch(async (req, res) => {
  // Check if the user making the request is a superadmin
  if (req.user.mainrole !== "superadmin") {
    return res.status(403).json({
      message: "This endpoint is assigned to superadmin",
    });
  }

  // Find the user by ID
  const user = await User.findById(req.params.id);

  // Check if the user exists
  if (!user) {
    return res.status(404).json({
      message: "User  not found",
    });
  }

  // Delete the user
  await user.deleteOne();

  // Optionally, update courses created by the user
  await Courses.updateMany(
    { createdBy: user._id },
    { $set: { createdBy: null } } // Set the createdBy field to null or handle it as per your logic
  );

  res.json({
    message: "User  deleted successfully",
  });
});


// export const editCourse = TryCatch(async (req, res) => {
//   const { title, description, category, duration, price } = req.body;

//   console.log('params', req.params)
//   const course = await Courses.findById(req.params.id);
//   if (!course) {
//     return res.status(404).json({
//       message: "Course not found",
//     });
//   }

//   // Update course details
//   course.title = title || course.title;
//   course.description = description || course.description;
//   course.category = category || course.category;
//   course.duration = duration || course.duration;
//   course.price = price || course.price;

//   // If a new image is uploaded, handle it
//   if (req.file) {
//     // Remove the old image
//     await unlinkAsync(course.image);
//     course.image = req.file.path; // Update to new image path
//   }

//   await course.save();

//   res.status(200).json({
//     message: "Course updated successfully",
//     course,
//   });
// });

export const editCourse = TryCatch(async (req, res) => {
  const { title, description, category, createdBy, duration, price } = req.body;

  console.log('req body', req.body);

  const course = await Courses.findById(req.params.id);
  if (!course) {
    return res.status(404).json({
      message: "Course not found",
    });
  }

  course.title = title || course.title;
  course.description = description || course.description;
  course.category = category || course.category;
  course.duration = duration || course.duration;
  course.price = price || course.price;

  if (req.file) {
    
    await unlinkAsync(course.image);
    course.image = req.file.path; 
  }

  
  await course.save();

  res.status(200).json({
    message: "Course updated successfully",
    course,
  });
});
