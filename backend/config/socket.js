let io;

module.exports = {
  setIO: (serverIO) => {
    io = serverIO;
  },
  getIO: () => io,
};
