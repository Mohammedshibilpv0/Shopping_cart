const { response } = require('express')
var db = require('../config/Connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { resource } = require('../app')
var objectId = require('mongodb').ObjectID
const Razorpay = require('razorpay');
const { promiseHooks } = require('v8')
const { promises } = require('dns')
var instance = new Razorpay({
  key_id: 'rzp_test_RygQDbYDdDM0j8',
  key_secret: 'RVyV4YEX5OIkXNK5QR3rh7XU',
});

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.Password = await bcrypt.hash(userData.Password, 10)
      db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
        resolve(data.ops[0])
      })


    })

  },  

  
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginstatus = false
      let response = {}
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
      if (user) {

        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log('login success')
            response.user = user
            response.status = true
            resolve(response)
          } else {
            console.log("login failed")
            resolve({ status: false })
          }
        })


      } else {
        console.log("login failed")
        resolve({ status: false })
      }


    })


  },
  addToCart: (prodId, userId) => {
    let proObj = {
      item: objectId(prodId),
      quantity: 1
    };

    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });

      if (userCart) {
        let proExist = userCart.products.findIndex(product => product.item == prodId);
        console.log(proExist);
        if (proExist != -1) {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: objectId(userId), 'products.item': objectId(prodId) }, {
              $inc: { 'products.$.quantity': 1 }
            })
            .then(() => {
              resolve();
            });
        } else {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: objectId(userId) }, {
              $push: { products: proObj }
            })
            .then(() => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj]
        };

        db.get().collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then(() => {
            resolve();
          });
      }
    });


  },

  getCartProducts: (userId) => {

    return new Promise(async (resolve, reject) => {
      let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {

          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',

            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        }



      ]).toArray();

      resolve(cartItems);
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      if (cart) {
        count = cart.products.length

      }
      resolve(count)
    })
  },
  
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);
    return new Promise((resolve, reject) => {
      if (details.count === -1 && details.quantity === 1) {
        db.get().collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            { $pull: { products: { item: objectId(details.product) } } }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        db.get().collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              'products.item': objectId(details.product)
            },
            {
              $inc: { 'products.$.quantity': details.count }
            }
          )
          .then((response) => {
            resolve({ status: true });
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
  },


  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1,
            quantity: { $toInt: '$quantity' },
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $toDouble: '$quantity' },
                  { $toDouble: '$product.Price' }
                ]
              }
            }
          }
        }
      ]).toArray();

      if (total.length > 0) {
        resolve(total[0].total);
      } else {
        resolve(0);
      }
    });
  },
  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      console.log(order, products, total)
      let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
      let orderObj = {
        deliveryDetails: {
          name: order.name,
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode
        },
        userId: objectId(order.userId),
        paymentMethod: order['payment-method'],
        products: products,
        totalAmount: total,
        status: status,
        date: new Date()

      }
      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
        db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectId(order.userId) })
        resolve(response.ops[0]._id)
      })



    })

  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      resolve(cart.products)
    })
  },

  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
      resolve(orders)
    })
  },

  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: { _id: objectId(orderId) }
        },
        {
          $unwind: '$products'
        },
        {

          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',

            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        }



      ]).toArray();
      console.log(orderItems)

      resolve(orderItems);

    })
  },



generateRazorpay: (orderId, total) => {
  console.log(orderId);
  return new Promise((resolve, reject) => {
      var options = {
          amount: total*100,
          currency: "INR",
          receipt: "" + orderId
      };
      instance.orders.create(options, function (err, order) {
          if (err) {
              console.log(err);
              reject(err);
          } else {
              console.log("New order:", order);
              resolve(order);
          }
      });
  });
},


verifyPayment:(details)=>{
  return new Promise ((resolve,reject)=>{
    const crypto = require('crypto');
    let hmac = crypto.createHmac('sha256', 'RVyV4YEX5OIkXNK5QR3rh7XU');

    hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);

    hmac=hmac.digest('hex')

    if(hmac===details[ 'payment[razorpay_signature]']){
      resolve()
    }else{
      reject()
    }
  })
},

changePaymentStatus:(orderId)=>{
  return new Promise ((resolve,reject)=>{
    db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
    {
      $set:{
        status:'placed'
      }
    }
    ).then(()=>{
      resolve()
    })
  })
},



getProduct:(proId)=>{
  return new Promise(async(resolve,reject)=>{
      let product=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({'_id':objectId(proId)})
   resolve(product)
  })
},

// userhelpers.js
searchProducts: (keyword) => {
  return new Promise((resolve, reject) => {
    db.get().collection(collection.PRODUCT_COLLECTION)
      .find({ $text: { $search: keyword } })
      .toArray((err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
  });
}


}