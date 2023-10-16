var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userhelpers = require("../helpers/user-helpers");
const session = require('express-session');
const { response } = require('../app');



const VerifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    next();
  
  } else {
  
    res.redirect('/login');
  }
};


/* GET home page. */
router.get('/',async function (req, res, next) {

  let user = req.session.user
  console.log(user)
  let cartCount=null
if(req.session.user){
 cartCount=await userhelpers.getCartCount(req.session.user._id)
}
  productHelpers.getAllProducts().then((Products) => {

    res.render('user/view-products', {admin:false,user:true, Products, user ,cartCount})
  })
});


router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {

    res.render("user/login", { 'LoginErr': req.session.userLoginErr })
  }
  req.session.userLoginErr = false
})

router.get("/signup", (req, res) => {
  res.render("user/signup")
})

router.post('/signup', (req, res) => {
  userhelpers.doSignup(req.body).then((response) => {
    console.log(response)
   
    req.session.user=null
    res.redirect('/login')


  })

})

router.post('/userLogin',  (req, res) => {
  userhelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    } else {
      req.session.userLoginErr =true
      res.redirect('/login')
    }
  })

})


router.get('/logout', (req, res) => {
  req.session.user=null
  res.redirect("/")
})


router.get('/cart',VerifyLogin, async(req, res) => {

  let user = req.session.user
  let products=await userhelpers.getCartProducts(req.session.user._id)
  let totalValue=await userhelpers.getTotalAmount(req.session.user._id)
  let  count = await userhelpers.getCartCount(req.session.user._id)
  
  res.render("user/cart",{products,user:req.session.user._id,totalValue,user,count})
})
 

router.get('/add-to-cart/:id',(req,res)=>{
  console.log("api call")
userhelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
  res.json({status:true})
})
})

router.post('/change-product-quantity', (req, res, next) => {
  userhelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userhelpers.getTotalAmount(req.body.user);
    res.json(response);
  });
});

router.get('/place-order',VerifyLogin,async(req,res)=>{
  let total=await userhelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

 
router.post('/place-order', async (req, res) => {
  let products = await userhelpers.getCartProductList(req.body.userId);
  let totalPrice = await userhelpers.getTotalAmount(req.body.userId);
  userhelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
      if (req.body['payment-method'] === 'COD') {
          res.json({ codSuccess: true });
      } else {
          userhelpers.generateRazorpay(orderId, totalPrice).then((response) => {
              res.json(response);
          });
      }
  });
  console.log(req.body);
});


router.get('/order-status',(req,res)=>{
  res.render('user/order-status',{user:req.session.user})
})
router.get('/order-page',async(req,res)=>{
  let orders=await userhelpers.getUserOrders(req.session.user._id)    
  res.render('user/order-page',{user:req.session.user,orders})
})

router.get('/product-added',(req,res)=>{
  res.render('user/product-added',{user:req.session.user})
})

router.get('/View-Order-Product/:id',async(req,res)=>{
  let products=await userhelpers.getOrderProducts(req.params.id)
  res.render('user/hai',{user:req.session.user,products})
})


router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userhelpers.verifyPayment(req.body)
    .then(() => {
      userhelpers.changePaymentStatus(req.body['order[receipt]'])
        .then(() => {
          console.log('Payment success');
          res.json({ status: true });
        })
        .catch((err) => {
          console.log('Error changing payment status:', err);
          res.json({ status: false });
        });
    })
    .catch((err) => {
      console.log('Error verifying payment:', err);
      res.json({ status: false });
    });
});


 router.get('/productPage/:id',async(req,res)=>{
  let product=await userhelpers.getProduct(req.params.id)
  res.render('user/product-page',{user:true,user:req.session.user,product})
 })


// users.js or admin.js
router.get('/search', (req, res) => {
  let keyword = req.query.keyword; // Get the keyword from the query parameter

  // Call the searchProducts function to retrieve the search results
  userhelpers.searchProducts(keyword).then((results) => {
    res.render('user/search-results', { results,user:true});
  });
});





module.exports = router;
