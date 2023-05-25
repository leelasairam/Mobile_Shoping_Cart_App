public class MobileShop {
    @AuraEnabled(cacheable=true)
    public static Map<String,Object> GetUserInfoAndCartCount(){
        Decimal TotalCartValue=0;
        Id UId = userinfo.getUserId();
        list<Cart_Product__c>CartItems = [SELECT Id,Mobile__c,Mobile__r.Mobile_Name__c,Mobile__r.Image__c,Mobile__r.Description__c,Mobile__r.Price__c FROM Cart_Product__c WHERE CreatedById=:UId];
        for(Cart_Product__c CP : CartItems){
            TotalCartValue+=CP.Mobile__r.Price__c;
        }
        return new Map<String,Object>{'UserId'=>UID,'CartItems'=>CartItems,'UserName'=>userinfo.getName(),'CartItemsSize'=>CartItems.size(),'CartValue'=>TotalCartValue};
    }
    
    @AuraEnabled(cacheable=true)
    public static list<Mobile_Product__c> GetProducts(String q){
        list<Mobile_Product__c>Products = new list<Mobile_Product__c>();
        if(q!=null){
            Products = database.query(q);
        }
        return Products;
    }
    
    @AuraEnabled
    public static void AddProductToCart(String ProductId){
        try{
            Cart_Product__c CartProduct = new Cart_Product__c(Mobile__c=ProductId);
        	insert CartProduct;
        }
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static String CreateOrder(map<String,list<String>>CartAndProductIds){
        list<String>ProductIds = (list<String>)CartAndProductIds.get('ProductIds');
        list<String>CartIds = (list<String>)CartAndProductIds.get('CartItemsIds');
        try{
            Ordered_Mobile__c OrderMobile = new Ordered_Mobile__c();
            insert OrderMobile;
            list<Mobile_Order_Item__c>MobileOrderItems = new list<Mobile_Order_Item__c>();
            for(Id i : ProductIds){
                Mobile_Order_Item__c MobileOrderItem = new Mobile_Order_Item__c(Mobile_Product__c=i,Ordered_Mobile__c=OrderMobile.Id);
                MobileOrderItems.add(MobileOrderItem);
            }
            if(MobileOrderItems.size()>0){
                insert MobileOrderItems;
            }
            list<Cart_Product__c>DeleteCartItems = [SELECT Id FROM Cart_Product__c WHERE Id IN :CartIds];
            delete DeleteCartItems;
            return OrderMobile.Id;
        }
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static Map<Id,list<Mobile_Order_Item__c>> GetOrderedProducts(String UId){
        list<Ordered_Mobile__c>OrderedMobiles = [SELECT Id FROM Ordered_Mobile__c WHERE CreatedById=:UId];
        list<Mobile_Order_Item__c>MobileOrderItems = [SELECT Id,Ordered_Mobile__c,Mobile_Product__c, Mobile_Product__r.Mobile_Name__c,Mobile_Product__r.Image__c,Mobile_Product__r.Price__c,Mobile_Product__r.Description__c FROM Mobile_Order_Item__c WHERE Ordered_Mobile__c IN :OrderedMobiles];
        Map<Id,list<Mobile_Order_Item__c>> GroupByOrderedId = new Map<Id,list<Mobile_Order_Item__c>>();
        for(Mobile_Order_Item__c item : MobileOrderItems){
            if(!GroupByOrderedId.containsKey(item.Ordered_Mobile__c)){
                GroupByOrderedId.put(item.Ordered_Mobile__c,new list<Mobile_Order_Item__c>());
            }
            GroupByOrderedId.get(item.Ordered_Mobile__c).add(item);
        }
        return GroupByOrderedId;
    }
    
    @AuraEnabled
    public static void RemoveItemFromCart(String CartItemId){
        try{
            list<Cart_Product__c>RemoveCartItem = [SELECT Id FROM Cart_Product__c WHERE Id =:CartItemId];
        	delete RemoveCartItem;
        }
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }
    
}