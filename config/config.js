const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb://localhost:27017/website");

connect.then(()=>{
  console.log("Connected database");
})
.catch(()=> {
    console.log("Error connect");
});
