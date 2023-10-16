const { response } = require('../app')
var db=require('../config/Connection')
const bcrypt = require('bcrypt')
var collection=require('../config/collections')
var objectId=require('mongodb').ObjectId
module.exports={

    addproduct:(product,callback)=>{
       
        db.get().collection('product').insertOne(product).then((data)=>{
         callback(data.ops[0]._id)

        })

    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(proId)}).then((response)=>{
                
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },


    UpdateProduct:(proId,ProductDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:objectId(proId)},{

                $set:{
                    Name:ProductDetails.Name,
                    Description:ProductDetails.Description,
                    Price:ProductDetails.Price,
                    Category:ProductDetails.Category,
                    Rating:ProductDetails.Rating

                }
            }).then((response)=>{
                resolve()
            })
        })

    },



    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
          let loginstatus = false
          let response = {}
          let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })
          if (admin) {
    
            bcrypt.compare(adminData.Password, admin.Password).then((status) => {
              if (status) {
                console.log('login success')
                response.admin = admin
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

   
      getAllOrders: (user) => {
        return new Promise(async (resolve, reject) => {
          let orders = await db.get().collection(collection.ORDER_COLLECTION).find({}).toArray()
          resolve(orders)
        })
      },
      

      allUsers:(user)=>{
        return new Promise(async(resolve,reject)=>{
            let allusers=await db.get().collection(collection.USER_COLLECTION).find({}).toArray()
            resolve(allusers)
        })
      },
              
        
   
 
}