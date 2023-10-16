var express = require('express');
var router = express.Router();
const session = require('express-session');
const productHelpers = require('../helpers/product-helpers');
const userhelpers=require('../helpers/user-helpers')



const VerifyLogin = (req, res, next) => {
  if (req.session.admin && req.session.admin.loggedIn) {
    next();
  } else {
    res.redirect('/admin/admin-login');
  }
};



router.get('/', VerifyLogin, function(req, res){
    let status = req.session.admin
   productHelpers.getAllProducts().then((Products)=>{
    console.log(Products)
    res.render('admin/view-product',{admin:true,Products,status})
   })
 
});



// GET route for admin login page
router.get('/admin-login', (req, res) => {
  res.render('admin/login', { adminLoginErr: req.session.adminLoginErr,admin:true }); // Render the admin login page with error message if present
});

// POST route for admin login form submission
router.post('/admin-login', (req, res) => {
productHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.admin.loggedIn = true;
      res.redirect('/admin'); // Redirect to admin dashboard on successful login
    } else {
      req.session.adminLoginErr = true;
      res.redirect('/admin/admin-login'); // Redirect back to admin login page with error message
    }
  });
});



// Add other admin routes as needed (e.g., add-product, edit-product, delete-product, etc.)












router.get('/add-product',VerifyLogin,function(req,res){
    res.render('admin/add-product',{admin:true})
})
   
router.post('/add-product',(req,res)=>{
  
    productHelpers.addproduct(req.body,(id)=>{
        let Image=req.files.Image
        Image.mv('./public/product-images/'+id+ '.jpg',(err)=>{
            if(!err){
                res.redirect('/admin')
            }
            else{
                console.log(err)
            }
        })
        
    })
})


router.get('/delete-product/:id',VerifyLogin,(req,res)=>{
 let proId=req.params.id
 console.log(proId)

 productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
 })
})

router.get('/edit-product/:id',VerifyLogin,async (req,res)=>{
    let product=await productHelpers.getProductDetails(req.params.id)
    

    res.render('admin/edit-product',{product,admin:true})
})


router.post('/edit-product/:id',(req,res)=>{
   let id=req.params.id
   productHelpers.UpdateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
        let Image=req.files.Image
        Image.mv('./public/product-images/'+id+ '.jpg')
    }
   })
})


router.get('/logout', (req, res) => {
  req.session.admin=null
  res.redirect("/admin")
})



router.get('/all-orders',VerifyLogin,async(req,res)=>{
  let orders=await productHelpers.getAllOrders(req.session)
  res.render('admin/all-orders',{admin:req.session.admin,orders})
})

 router.get('/alluser',VerifyLogin,async(req,res)=>{
  let users=await productHelpers.allUsers(req.session)
  res.render('admin/user',{users,admin:true})
 })

 


 





module.exports = router;
