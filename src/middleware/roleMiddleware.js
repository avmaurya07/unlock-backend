module.exports = function role(requiredRole) {
  return (req, res, next) => {
    console.log("ROLE CHECK:", req.user);
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        
      }

      if (req.user.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Access denied",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Server error in role check",
      });
    }
  };
};

