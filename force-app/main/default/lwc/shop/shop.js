import { LightningElement , track ,wire , api } from 'lwc';
import GetUserInfoAndCartCount from '@salesforce/apex/MobileShop.GetUserInfoAndCartCount';
import GetProducts from '@salesforce/apex/MobileShop.GetProducts';
import AddProductToCart from '@salesforce/apex/MobileShop.AddProductToCart';
import CreateOrder from '@salesforce/apex/MobileShop.CreateOrder';
import GetOrderedProducts from '@salesforce/apex/MobileShop.GetOrderedProducts';
import RemoveItemFromCart from '@salesforce/apex/MobileShop.RemoveItemFromCart';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningConfirm from 'lightning/confirm';

export default class Shop extends LightningElement {
    @track Products = [];
    @track ShowCart = true;
    @track InitialResponse = {};
    @track load = false;
    @track WireResponse=[];
    @track OrderItems = [];

    @wire (GetUserInfoAndCartCount)
    GetInitialResponse(result){
        this.WireResponse = result;
        if(result.data){
            this.InitialResponse = result.data;
        }
        else if(result.error){
            this.Toast('Error',error,'error');
        }
    }

    connectedCallback(){
        this.GetAllProducts();
    }

    Toast(title,msg,varient){
        const event = new ShowToastEvent({
            title: title,
            message: msg,
            variant: varient,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    async GetProductItems(ExeQuery){
        this.load = true;
        await GetProducts({q:ExeQuery})
        .then(result => {
            this.Products = result;
            this.load = false;
        })
        .catch(error => {
            this.Toast('Error',error,'error');
        });
    }

    GetAllProducts(){
        const query = 'SELECT Id,Image__c,Mobile_Name__c,Price__c,Description__c FROM Mobile_Product__c';
        this.GetProductItems(query);
    }

    SearchProducts(){
        let keyword = this.template.querySelector(".search").value;
        const query = `SELECT Id,Image__c,Mobile_Name__c,Price__c,Description__c FROM Mobile_Product__c WHERE Mobile_Name__c LIKE '${keyword}%'`;
        this.GetProductItems(query);
    }

    SortProducts(event){
        const btn_name = event.target.dataset.btn;
        let query = '';
        if(btn_name == 'low-to-high'){
            query = 'SELECT Id,Image__c,Mobile_Name__c,Price__c,Description__c FROM Mobile_Product__c ORDER BY Price__c ASC';
        }
        else if(btn_name == 'high-to-low'){
            query = 'SELECT Id,Image__c,Mobile_Name__c,Price__c,Description__c FROM Mobile_Product__c ORDER BY Price__c DESC';
        }
        this.GetProductItems(query);
    }

    async CreateCartItem(event){
        const ProductId = event.target.dataset.productid;
        this.load = true;
        try{
            const response = await AddProductToCart({ProductId:ProductId});
            refreshApex(this.WireResponse);
            this.Toast('Done','Item added to cart', 'success');
        }
        catch(error){
            this.Toast('Error',error,'error');
        }
        this.load = false;
    }

    async RemoveCartItem(event){
        const CartItemId = event.target.dataset.cartitemid;
        try{
            this.load = true;
            const response = await RemoveItemFromCart({CartItemId:CartItemId});
            refreshApex(this.WireResponse);
            this.load = false;
            this.Toast('Done','Item removed from cart','success');
        }
        catch(error){
            this.Toast('Error',error,'error');
        }
    }

    async OrderConfirmation() {
        const result = await LightningConfirm.open({
            message: `Click 'OK' to order the cart items value of ${this.InitialResponse.CartValue}/-`,
            variant: 'header',
            label: 'Confirm the order',
            theme: 'shade'
        });
        if(result){
            if(this.InitialResponse.CartItems.length>0){
                const ProductIds = [];
                const CartItemsIds = [];
                this.InitialResponse.CartItems.forEach(i => {
                    CartItemsIds.push(i.Id);
                    ProductIds.push(i.Mobile__c);
                })
                try{
                    this.load = true;
                    const CartAndProductIds = {'ProductIds':ProductIds,'CartItemsIds':CartItemsIds};
                    const response = await CreateOrder({CartAndProductIds:CartAndProductIds});
                    refreshApex(this.WireResponse);
                    this.load = false;
                    this.Toast('Done',`Ordered Successfully [OrderId : ${response}]`,'success');
                }
                catch(error){
                    this.Toast('Error',error,'error');
                }
            }
            else{
                this.Toast('Error','No items in cart','error');
            }
        }
    }

   async GetOrderedItems(event){
        const IsRefresh = event.target.dataset.orderbtn;
        if(IsRefresh === 'refresh'){
            this.OrderItems = [];
        }
        if(this.OrderItems.length==0){
            this.load = true;
            await GetOrderedProducts({UId:this.InitialResponse.UserId})
            .then(result => {
                const keys = Object.keys(result);
                const OrdersList = [];
                keys.forEach((i,j) =>{
                    OrdersList.push({Id:i,Orders:result[i]});
                })
                this.OrderItems = OrdersList;
            })
            .catch(error => {
                this.Toast('Error',error,'error');
            });
            this.load = false;
        }
        this.ShowCart = false;
    }

    ShowCartItems(){
        this.ShowCart = true;
    }
}