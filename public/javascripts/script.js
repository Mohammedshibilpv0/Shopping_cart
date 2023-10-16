function addToCart(prodId){
    $.ajax({
        url:'/add-to-cart/'+prodId,
        method:'get',
        success:(response)=>{
            if(response.status){
                let count=$('#cart-Count').html()
                count=parseInt(count)+1
                $("#cart-Count").html(count)
                window.location.href='/product-added'

            }
     

        }
    })
}



