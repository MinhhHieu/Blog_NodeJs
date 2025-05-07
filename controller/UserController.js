const Blog = require("../model/blog");
const User = require("../model/users");
const path = require("path");
const { render } = require("ejs");
const jwt = require("jsonwebtoken");
const cookieParse = require("cookie-parser");

// cấu hình thêm blog
const sharp = require("sharp");
const validator = require("validator");

var multer = require("multer");
const { title } = require("process");
var upload = multer({ dest: "uploads/" });

// [GET] /blogUser Hiển thị trang Blog của người dùng
exports.blogUser = async (req, res) => {
  try {
    // Lấy người dùng từ token
    const user = await User.findOne({ token: req.cookies.jwt });

    if (!user) {
      return res.redirect("/login");
    }

    // Lấy tất cả các blog mà người dùng đã đăng (dựa trên user_id)
    const blogs = await Blog.find({ user_id: user._id });

    res.render("blogUser", { name: user.name, email: user.email, blogs });
  } catch (error) {
    res.status(500).send("Error while fetching blog data");
  }
};

// [GET] /blog Hiển thị trang blog
exports.getCreateBlog = async (req, res) => {
  res.render("blog");
};

// [POST] /blog Thêm bài viết
exports.CreateBlog = [
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      let image = null;

      if (req.file) {
        image = req.file.path;
      }

      // Kiểm tra tính hợp lệ của title và description
      if (!validator.isLength(title, { min: 3, max: 100 })) {
        throw new Error("Tiêu đề phải có từ 3 đến 100 ký tự");
      }
      if (!validator.isLength(description, { min: 10, max: 100000 })) {
        throw new Error("Mô tả phải có từ 10 đến 100000 ký tự");
      }

      // Lấy thông tin người dùng từ token
      const user = await User.findOne({ token: req.cookies.jwt });

      if (!user) {
        throw new Error("Người dùng không hợp lệ hoặc chưa đăng nhập.");
      }

      // Tạo mới blog và gán user_id từ người dùng đã đăng nhập
      const newBlog = new Blog({
        image,
        title,
        description,
        user_id: user._id, // Gán user_id
      });

      // Lưu blog mới vào cơ sở dữ liệu
      await newBlog.save();

      // Điều hướng đến trang chủ sau khi tạo blog
      res.redirect("/blogUser");
    } catch (error) {
      res.status(400).send(error.message); // Nếu có lỗi, trả về thông báo lỗi
    }
  },
];

//[GET] /blog/edit/:id Trang chỉnh sửa bài viết
exports.editBlog = async (req, res) => {
  const blogId = req.params.id;

  const blog = await Blog.findOne({
    _id: blogId
  });
  res.render("editBlog", { blog });
};

// [POST] sửa bài viết
exports.editPost = [
  upload.single("image"),
  async (req, res) => {
    const blogId = req.params.id;

    try {
      const { title, description } = req.body;
      let updateData = {
        title,
        description
      };

      if (req.file) {
        updateData.image = req.file.path;
      }

      await Blog.updateOne({ _id: blogId }, updateData);

      res.redirect("/blogUser");
    } catch (error) {
      console.error("Lỗi khi cập nhật blog:", error);
      res.status(500).send("Có lỗi xảy ra khi chỉnh sửa blog");
    }
  }
];


// [POST] /delete/:id xóa Blog
exports.deleteBlog = async (req, res) => {
  const blogId = req.params.id;

  try {
    await Blog.deleteOne({ _id: blogId });
    console.log("Xóa blog thành công");
    res.redirect("/blogUser");
  } catch (error) {
    console.error("Lỗi khi xóa blog:", error);
    res.send("Đã xảy ra lỗi trong quá trình xóa blog");
  }
};

// [GET] /blog/:id Hiển thị trang chi tiết blog
exports.getBlogDetail = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).send("Blog not found");
    }

    res.render("blogDetail", { blog });
  } catch (error) {
    res.status(500).send("Error while fetching blog data");
  }
};

// display trang chủ
exports.DisplayBlogHome = async (req, res) => {
  try {
    const user = await User.findOne({ token: req.cookies.jwt });
    const blogs = await Blog.find();
    res.redirect("/home");
  } catch (error) {
    res.status(500).send("Error while fetching blog data");
  }
};

exports.getHomePage = async (req, res) => {
  try {
    const user = await User.findOne({ token: req.cookies.jwt });

    if (!user) {
      return res.redirect("/login");
    }

    const blogs = await Blog.find({ isShared: true });
    res.render("home", { name: user.name, email: user.email, blogs });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error while fetching data");
  }
};

// Share blog
exports.shareBlog = async (req, res) => {
  const blogId = req.params.id;

  try {
    await Blog.updateOne({ _id: blogId }, { isShared: true });
    res.redirect("/blogUser");
  } catch (error) {
    console.error("Lỗi khi chia sẻ blog:", error);
    res.status(500).send("Có lỗi xảy ra khi chia sẻ blog");
  }
};


// Đăng xuất người dùng
exports.logoutUser = (req, res) => {
  // Xóa token khỏi cookie
  res.clearCookie("jwt");
  // Sau đó điều hướng người dùng về trang đăng nhập
  res.redirect("/");
};



