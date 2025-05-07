const User = require("../model/users");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParse = require("cookie-parser");
const bcryptjs = require("bcryptjs");
const { render } = require("ejs");
const Blog = require("../model/blog");


// Hiển thị trang đăng nhập
exports.getLoginPage = async (req, res) => {
  if (req.cookies.jwt) {
    try {
        const verify = jwt.verify(req.cookies.jwt, "minhhieu");
        const user = await User.findOne({ token: req.cookies.jwt });
        if (user) {
            if (user.role === 'admin') {
              const users = await User.find();
              const { totalUsers, totalAdmins } = await getUserCounts();
              const { totalBlog } = await CountBlog();
              const blogs = await Blog.find();
              res.redirect("/admin");
            } else {
              const blogs = await Blog.find();
              res.redirect("/home");
            }
        } else {
            res.send("error try catch");
        }
    } catch (error) {
        res.send("erorr login");
    }
} else {
    res.render("login");
}
};

// Hiển thị trang đăng ký
exports.getSignupPage = (req, res) => {
  res.render("signup");
};

// Hiển thị trang admin
exports.getAdminPage = async (req, res) => {
  const users = await User.find();
  const user = await User.findOne({ token: req.cookies.jwt });
  const { totalUsers, totalAdmins } = await getUserCounts();
  const { totalBlog } = await CountBlog();
  const blogs = await Blog.find();
  res.render("admin", { users, name: user.name, email: user.email, totalUsers, totalAdmins, blogs,totalBlog });
};


// Hiển thị trang cập nhật người dùng
exports.getUpdatePage = async (req, res) => {
  const userId = req.params.id;
  const user = await User.findOne({ _id: userId });
  if (user) {
    res.render("update", { userId: userId, user: user });
  } else {
    res.send("Không tìm thấy người dùng");
  }
};


// Tạo người dùng mới
exports.createUser = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    if (check) {
        res.send("email already exists");
    } else {
        const token = jwt.sign({ email: req.body.email }, "qwertyuioplkajshfgdmznxbcvASDFGHJKLPQOWIEURYTVBNCMZ1234567890");

        res.cookie("jwt", token, {
            maxAge: 3600000,
            httpOnly: true
        });

        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: await hashPass(req.body.password),
            token: token,
            role: req.body.role || 'user' // Gán vai trò 'admin' nếu được chọn, hoặc 'user' nếu không
        });
        await newUser.save();
        const user = await User.findOne({ token: token });
        const blogs = await Blog.find();
        // res.render('home', { blogs, name: user.name, email: user.email });
        res.redirect("/home");
    }
} catch (error) {
    res.send("wrong detail");
}
};



// Hiển thị danh sách người dùng
exports.displayUsers = async (req, res) => {
  const users = await User.find();
  const { totalUsers, totalAdmins } = await getUserCounts();
  const { totalBlog } = await CountBlog();
  const blogs = await Blog.find();
  res.render("admin", { users, totalUsers, totalAdmins, blogs,totalBlog });
};


// Cập nhật người dùng
exports.updateUser = async (req, res) => {
  const userId = req.params.id;
  const token = req.cookies.jwt; // Lấy token từ cookie
  const updatedData = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    token: token,
  };

  try {
    await User.updateOne({ _id: userId }, { $set: updatedData });
    console.log("Cập nhật người dùng thành công");
    res.redirect("/admin");
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng:", error);
    res.send("Đã xảy ra lỗi trong quá trình cập nhật người dùng");
  }
};

// Đăng nhập người dùng
exports.loginUser = async (req, res) => {
  try {
    const check = await User.findOne({ email: req.body.email });
    const passCheck = await compare(req.body.password, check.password);

    if (check && passCheck) {
      const role = check.role; // Lấy vai trò từ database
      if (role === 'admin') {
        // Nếu là admin, điều hướng đến trang admin
        const users = await User.find();
        res.cookie("jwt", check.token, {
          maxAge: 3600000,
          httpOnly: true
        });
        const { totalUsers, totalAdmins } = await getUserCounts();
        const { totalBlog } = await CountBlog();
        const blogs = await Blog.find();
        res.redirect("/admin")
      } else {
        // Nếu là user, điều hướng đến trang home
        res.cookie("jwt", check.token, {
          maxAge: 3600000,
          httpOnly: true
        });
        const user = await User.findOne({ token: req.cookies.jwt });
        const blogs = await Blog.find();
        res.redirect("/home")
      }
    } else {
      res.send("user detail exists");
    }
  } catch (error) {
    res.send("wrong detail exit");
  }
};

// Xóa người dùng
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

//tìm kiếm user
exports.searchUser = async (req, res) => {

  const user = await User.findOne({ token: req.cookies.jwt });
  try {
    const TextSearch = req.body.search;

    // Kiểm tra xem TextSearch có khớp với name hoặc email của bất kỳ người dùng nào không
    const checkUser = await User.findOne({
      $or: [
        { name: TextSearch },
        { email: TextSearch },
      ],
    });

    if (checkUser) {
      // Tìm thấy người dùng, chỉ lấy người dùng đó
      const users = await User.find({
        $or: [
          { name: TextSearch },
          { email: TextSearch },
        ],
      });
      const { totalUsers, totalAdmins } = await getUserCounts();
      const { totalBlog } = await CountBlog();
      const blogs = await Blog.find();
      res.render("admin", { users, name: user.name, email: user.email, totalAdmins, totalUsers, totalBlog, blogs });
    } else {
      res.redirect("/admin");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for user");
  }
};

// Đăng xuất người dùng
exports.logoutAdmin = (req, res) => {
  // Xóa token khỏi cookie
  res.clearCookie('jwt');
  // Sau đó điều hướng người dùng về trang đăng nhập
  res.redirect('/');
};
async function hashPass(password){
  const res = await bcryptjs.hash(password,10)
  return res
}

async function compare(userPass, hashPass) {
  const res = await bcryptjs.compare(userPass, hashPass);
  return res;
}


async function getUserCounts() {
  const usersCount = await User.find();
  let totalUsers = 0;
  let totalAdmins = 0;
  usersCount.forEach(user => {
    if (user.role === 'user') {
      totalUsers++;
    } else if (user.role === 'admin') {
      totalAdmins++;
    }
  });
  return { totalUsers, totalAdmins };
}


async function CountBlog() {
  const usersCount = await Blog.find();
  let totalBlog = 0;
  usersCount.forEach(user => {
    totalBlog++
  });
  return { totalBlog };
}




// Xóa blog
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
