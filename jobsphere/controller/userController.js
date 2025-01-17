const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { generateTokens, verifyRefreshToken } = require("../middleware/auth");
const { sendActivationEmail } = require('../utils/sendEmail');
const UserStatus = require("../models/UserStatus");

// REGISTER USER
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, keywords } = req.body;

    // Validate role
    if (!["job_seeker", "employer", "admin"].includes(role)) {
      req.flash("error", "Invalid role specified.");
      return res.redirect("/register");
    }

    // Validate keywords for job seekers/employers
    if (["job_seeker", "employer"].includes(role) && (!keywords || !keywords.length)) {
      req.flash("error", "Keywords are required for job seekers or employers.");
      return res.redirect("/register");
    }

    // Validate password strength
    const passwordRequirements = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRequirements.test(password)) {
      req.flash("error", "Password must be at least 8 characters long, include an uppercase letter, and a number.");
      return res.redirect("/register");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email is already registered.");
      return res.redirect("/register");
    }

    // Hash password and save user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      keywords,
    });
    req.flash("success", "Registration successful! Please log in.");
    return res.redirect('/login');
  } catch (error) {
    req.flash("error", "Internal Server Error.");
    res.redirect("/register");
  }
};



exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user credentials
    const user = await User.findOne({ email });

    // If the user doesn't exist or the password is invalid
    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    // Fetch user's active status from the UserStatus collection
    const userStatus = await UserStatus.findOne({ userId: user._id });

    // Handle inactive users
    if (userStatus?.isActive === false) {
      await sendActivationEmail(email);
      req.flash("error", "Account is deactivated. Check your email to reactivate.");
      return res.redirect("/login");
    }

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      keywords: user.keywords
    };
    console.log(req.session.user);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set tokens in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true, // Protect the cookie from JavaScript access
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // Allows cookies to be sent with cross-origin requests
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Redirect based on user role
    if (user.role === "admin") {
      return res.render("users/admin_dashboard", { user });
    } else if (user.role === "job_seeker") {
      return res.render("users/jobSeeker_dashboard", { user });
    } else if (user.role === "employer") {
      return res.render("users/employer_dashboard", { user });
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

  } catch (error) {
    req.flash("error", "Internal Server Error.");
    res.redirect("/login");
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token provided" });

    const { user } = verifyRefreshToken(refreshToken);
    const newAccessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid refresh token", error });
  }
};

// LOGOUT USER
exports.logoutUser = (req, res) => {
  console.log("Logout request received");
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  req.session.user = null; 
  req.flash("success", "Successfully logged out.");
  res.redirect("/login");
};




// userController.js
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, keywords } = req.body;

    const updates = { name, email, role };
    if (keywords) {
      updates.keywords = Array.isArray(keywords) ? keywords : [keywords];
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      keywords: user.keywords
    };

    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (err) {
    console.error("Profile update error:", err);
    req.flash('error', 'An error occurred while updating the profile');
    res.redirect('/profile');
  }
};




// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/forgotPassword");
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_GMAIL,
        pass: process.env.MY_PASSWORD,
      },
    });

    const resetLink = `${process.env.CLIENT_URL}/resetPassword?token=${token}`;

    const mailOptions = {
      from: process.env.MY_GMAIL,
      to: email,
      subject: "Password Reset Request",
      text: `Click on this link to reset your password: ${resetLink}`
    };

    await transporter.sendMail(mailOptions);
    req.flash("success", "Password reset link sent to your email.");
    res.render('users/passwordResetSent')
    //return res.redirect('passwordResetSent')
  } catch (error) {
    req.flash("error", "Internal Server Error.");
    res.redirect("/forgotPassword");
  }
};



// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/resetPassword");
    }

    // Validate and hash new password
    const passwordRequirements = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRequirements.test(newPassword)) {
      req.flash("error", "Password must meet the required criteria.");
      return res.redirect(`/resetPassword?token=${token}`);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Send only one response
    req.flash("success", "Password reset successfully. Please log in.");
    res.redirect("/login");

  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Invalid or expired token" });
  }
};