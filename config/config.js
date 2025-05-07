const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb://localhost:27017/website");

connect.then(()=>{
  console.log("connected database");
})
.catch(()=> {
    console.log("erorr connect");
});
