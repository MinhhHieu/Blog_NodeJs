const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    image: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      user_id:{
        type: mongoose.Schema.Types.ObjectId, // Sử dụng ObjectId để tham chiếu đến user
        ref: 'User',
        required: true,
      },
      isShared: {
        type: Boolean,
        default: false
      }
});

const Blog = new mongoose.model("blog",Schema)

module.exports=Blog