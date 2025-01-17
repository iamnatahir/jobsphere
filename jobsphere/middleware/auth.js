const jwt = require("jsonwebtoken");

// Middleware to authenticate access tokens
exports.authenticateAccessToken = (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Forbidden - Invalid token" });
      }

      req.user = decoded; // Attach user data to request
      next();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  res.redirect('/login');
};


// Middleware to verify refresh tokens
exports.verifyRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.status(403).json({ message: "Refresh token required" });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid or expired refresh token" });

    req.user = user; // Attach user data to request
    next();
  });
};

// Function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET, // Use the correct secret for refresh tokens
    { expiresIn: '7d' } // 7 days
  );

  return { accessToken, refreshToken };
};

// Export the generateTokens function
exports.generateTokens = generateTokens;
