const User = require("../model/users");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParse = require("cookie-parser");
//bcryptsjs mã hóa và so sánh mật khẩu
const bcryptjs = require("bcryptjs");
const { render } = require("ejs");
const Blog = require("../model/blog");

// [GET] Hiển thị trang đăng nhập
exports.getLoginPage = async (req, res) => {
  // nếu có token trong cookie
  if (req.cookies.jwt) {
    try {
      // check token user
      const verify = jwt.verify(
        req.cookies.jwt,
        "qwertyuioplkajshdgfbvncmzx1234567890QNJNJKEWFJWKF"
      );
      const user = await User.findOne({ token: req.cookies.jwt });
      if (user) {
        if (user.role === "admin") {
          const users = await User.find();
          const { totalUsers, totalAdmins } = await getUserCounts();
          const { totalBlog } = await CountBlog();
          const blogs = await Blog.find();
          res.redirect("/admin");
        } else {
          const blogs = await Blog.find();
          res.redirect("/home");
        }
      }
    } catch (error) {
      res.send("Lỗi đăng nhập");
    }
  } else {
    res.render("login");
  }
};

// [GET]Hiển thị trang đăng ký
exports.getSignupPage = (req, res) => {
  res.render("signup");
};

// [GET]Hiển thị trang admin
exports.getAdminPage = async (req, res) => {
  const users = await User.find();
  const user = await User.findOne({ token: req.cookies.jwt });
  const { totalUsers, totalAdmins } = await getUserCounts();
  const { totalBlog } = await CountBlog();
  const blogs = await Blog.find();
  res.render("admin", {
    users,
    name: user.name,
    email: user.email,
    totalUsers,
    totalAdmins,
    blogs,
    totalBlog,
  });
};

// [GET]Hiển thị trang cập nhật người dùng
exports.getUpdatePage = async (req, res) => {
  // lay id 
  const userId = req.params.id;
  const user = await User.findOne({ _id: userId });
  if (user) {
    res.render("update", { userId: userId, user: user });
  } else {
    res.send("Không tìm thấy người dùng");
  }
};

// [POST]Tạo người dùng mới
exports.createUser = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    if (check) {
      res.send("Email đã tồn tại!");
    } else {
      const token = jwt.sign(
        { email: req.body.email },
        "qwertyuioplkajshfgdmznxbcvASDFGHJKLPQOWIEURYTVBNCMZ1234567890"
      );

      res.cookie("jwt", token, {
        maxAge: 3600000,
        httpOnly: true, //bảo mật cookie
      });

      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: await hashPass(req.body.password), // dùng hashPass để mã hóa mật khẩu
        token: token,
        role: req.body.role || "user", 
      });
      await newUser.save();
      const user = await User.findOne({ token: token });
      const blogs = await Blog.find();
      // res.render('home', { blogs, name: user.name, email: user.email });
      res.redirect("/home");
    }
  } catch (error) {
    res.send("Tạo thất bại!");
  }
};

// [GET]Hiển thị danh sách người dùng
exports.displayUsers = async (req, res) => {
  const users = await User.find();
  const { totalUsers, totalAdmins } = await getUserCounts();
  const { totalBlog } = await CountBlog();
  const blogs = await Blog.find();
  res.render("admin", { users, totalUsers, totalAdmins, blogs, totalBlog });
};

// [POST]Cập nhật người dùng
exports.updateUser = async (req, res) => {
  const userId = req.params.id;
  // use jwt.sign để tạo lại jwt mới khi thông tin người dùng thay đổi
  const newToken = jwt.sign(
    { email: req.body.email, role: req.body.role },
    "qwertyuioplkajshfgdmznxbcvASDFGHJKLPQOWIEURYTVBNCMZ1234567890"
  );
  const updatedData = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    token: newToken,
  };

  try {
    // dùng $set trong mongoose để update các trường trong User
    await User.updateOne({ _id: userId }, { $set: updatedData });
    console.log("Cập nhật người dùng thành công");
    res.redirect("/admin");
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng:", error);
    res.send("Đã xảy ra lỗi trong quá trình cập nhật người dùng");
  }
};

// [POST]Đăng nhập người dùng
exports.loginUser = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });

    if (!check) return res.send("Email không tồn tại");

    // dùng compare check mật khẩu
    const passCheck = await compare(req.body.password, check.password); 
    if (!passCheck) return res.send("Sai mật khẩu");

    // Tạo token mới theo thông tin mới nhất
    const token = jwt.sign(
      { email: check.email, role: check.role },
      "qwertyuioplkajshdgfbvncmzx1234567890QNJNJKEWFJWKF"
    );

    check.token = token;
    await check.save();

    res.cookie("jwt", token, {
      maxAge: 3600000,
      httpOnly: true, // bảo mật token 
    });

    if (check.role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/home");
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.send("Đăng nhập thất bại");
  }
};

// [POST]Xóa người dùng
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    await User.deleteOne({ _id: userId });
    console.log("Xóa người dùng thành công");
    res.redirect("/admin");
  } catch (error) {
    console.error("Lỗi khi xóa người dùng:", error);
    res.send("Đã xảy ra lỗi trong quá trình xóa người dùng");
  }
};

// [POST]Xóa blog
exports.deleteBlog = async (req, res) => {
  const blogId = req.params.id;

  try {
    await Blog.deleteOne({ _id: blogId });
    console.log("Xóa blog thành công");
    res.redirect("/admin");
  } catch (error) {
    console.error("Lỗi khi xóa blog:", error);
    res.send("Đã xảy ra lỗi trong quá trình xóa blog");
  }
};

//[POST]tìm kiếm user
exports.searchUser = async (req, res) => {
  const user = await User.findOne({ token: req.cookies.jwt });
  try {
    const TextSearch = req.body.search;

    // Kiểm tra xem TextSearch có khớp với name hoặc email của bất kỳ người dùng nào không
    const checkUser = await User.findOne({
      $or: [{ name: TextSearch }, { email: TextSearch }],
    });

    if (checkUser) {
      // Tìm thấy người dùng, chỉ lấy người dùng đó
      const users = await User.find({
        $or: [{ name: TextSearch }, { email: TextSearch }],
      });
      const { totalUsers, totalAdmins } = await getUserCounts();
      const { totalBlog } = await CountBlog();
      const blogs = await Blog.find();
      res.render("admin", {
        users,
        name: user.name,
        email: user.email,
        totalAdmins,
        totalUsers,
        totalBlog,
        blogs,
      });
    } else {
      res.redirect("/admin");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Không tìm thấy người dùng");
  }
};

// Đăng xuất người dùng
exports.logoutAdmin = (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/");
};

// mã hóa pass
async function hashPass(password) {
  const res = await bcryptjs.hash(password, 10);
  return res;
}

// check pass user
async function compare(userPass, hashPass) {
  // userPass: pass user nhập vao, hassPass: mã hóa pass
  const res = await bcryptjs.compare(userPass, hashPass);
  return res;
}

// tổng user,admin
async function getUserCounts() {
  const usersCount = await User.find();
  let totalUsers = 0;
  let totalAdmins = 0;
  usersCount.forEach((user) => {
    if (user.role === "user") {
      totalUsers++;
    } else if (user.role === "admin") {
      totalAdmins++;
    }
  });
  return { totalUsers, totalAdmins };
}

async function CountBlog() {
  const usersCount = await Blog.find();
  let totalBlog = 0;
  usersCount.forEach((user) => {
    totalBlog++;
  });
  return { totalBlog };
}


