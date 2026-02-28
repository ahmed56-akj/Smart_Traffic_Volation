const errorHandler = (err, req, res, next) => {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.message);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, error: 'Validation Error', messages });
  }

  if (err.code === 11000) {
    return res.status(400).json({ success: false, error: 'Duplicate key - record already exists' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'Invalid ID format' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
