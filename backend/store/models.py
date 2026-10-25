from django.db import models
from django.utils import timezone  

class Sales(models.Model):
    invoice = models.IntegerField(blank=True, null=True)
    sales_order_id = models.CharField(max_length=50, blank=True, null=True)
    asclepius_id = models.CharField(max_length=50, blank=True, null=True)
    customer = models.CharField(max_length=60, blank=True, null=True)
    addresses = models.CharField(max_length=160, blank=True, null=True)
    payment_mode = models.CharField(max_length=20, blank=True, null=True)

    bill_date = models.DateField(blank=True, null=True)
    item_id = models.CharField(max_length=40, blank=True, null=True) # Tag ID basically
    item_group = models.CharField(max_length=40, blank=True, null=True)
    item_name = models.CharField(max_length=60, blank=True, null=True)
    
    rate = models.IntegerField(blank=True, null=True)
    discount = models.IntegerField(blank=True, null=True)
    total = models.IntegerField(blank=True, null=True)
    remarks = models.CharField(max_length=40, blank=True, null=True)
    sold_by = models.CharField(max_length=40, blank=True, null=True)
    mobile = models.CharField(max_length=14, blank=True, null=True)
    email = models.CharField(max_length=60, blank=True, null=True)
    quantity = models.IntegerField(blank=True, null=True)
    
    bill_grand_total = models.IntegerField(blank=True, null=True)
    bill_sattlement_amt = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)

    repurchase = models.CharField(max_length=50, db_column='Repurchase', blank=True, null=True)
    activation = models.CharField(max_length=50, db_column='Activation', blank=True, null=True)
    for_ids = models.TextField(db_column='for_ids', blank=True, null=True)
    sp = models.DecimalField(max_digits=12, decimal_places=2, db_column='SP', blank=True, null=True)
    tsp = models.DecimalField(max_digits=12, decimal_places=2, db_column='TSP', blank=True, null=True)
    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)

    cash = models.DecimalField(max_digits=12, decimal_places=2, db_column='Cash', default=0.0, blank=True, null=True)
    credit = models.DecimalField(max_digits=12, decimal_places=2, db_column='Credit', default=0.0, blank=True, null=True)
    upi = models.DecimalField(max_digits=12, decimal_places=2, db_column='UPI', default=0.0, blank=True, null=True)


    class Meta:
        db_table = 'sales'  # Yeh line Django ko batati hai ki table ka naam 'sales' rakhna hai

class BillwiseSPSettlement(models.Model):
    id = models.AutoField(primary_key=True)
    inv_no = models.CharField(max_length=50, blank=True, null=True, db_column='Inv_No')
    tsp = models.DecimalField(max_digits=12, decimal_places=2, db_column='TSP', blank=True, null=True)
    customer = models.CharField(max_length=100, blank=True, null=True, db_column='Customer')
    for_id = models.CharField(max_length=50, blank=True, null=True, db_column='For_Id')
    used_in = models.CharField(max_length=100, blank=True, null=True, db_column='Used_in')
    used_sp = models.DecimalField(max_digits=12, decimal_places=2, db_column='Used_SP', blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True, db_column='Status')
    remarks = models.TextField(blank=True, null=True, db_column='Remarks')
    firm_id = models.CharField(max_length=50, blank=True, null=True, db_column='firm_id')
    flag1 = models.CharField(max_length=50, blank=True, null=True, db_column='flag1')
    flag2 = models.CharField(max_length=50, blank=True, null=True, db_column='flag2')
    bill_date = models.DateField(blank=True, null=True, db_column='bill_date')

    class Meta:
        db_table = 'billwise_sp_sattlement'

#  modified for asclepius
class StockForSale(models.Model):    
    sl_no = models.AutoField(primary_key=True, db_column='SlNo')    
    
    purchase_v_no = models.CharField(max_length=50, db_column='Purchase_V_No', blank=True, null=True)
    tag_text = models.CharField(max_length=40, db_column='TagText') # TagID ke liye query chalane me kaam aayega
    groups = models.CharField(max_length=100, db_column='Groups', blank=True, null=True)
    item = models.CharField(max_length=100, db_column='Item', blank=True, null=True)
    remarks = models.TextField(db_column='Remarks', blank=True, null=True)    
    item_image = models.ImageField(upload_to='Asclepius/stock_photos/', blank=True, null=True)
    entry_date = models.DateTimeField(default=timezone.now)

    purchase_quantity = models.DecimalField(max_digits=4, decimal_places=0, db_column='purchase_quantity', blank=True, null=True)
    flag1 = models.CharField(max_length=20, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=20, db_column='Flag2', blank=True, null=True)
    flag3 = models.CharField(max_length=20, db_column='Flag3', blank=True, null=True)

    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)

 

    class Meta:
        db_table = 'stock_for_sale'  # MySQL me is naam ki table banegi  
    
    # 🔥 UPDATE: Ek product ki multiple photos save karne ke liye naya model
class StockImages(models.Model):
    # Yeh line is photo ko aapke StockForSale wale product (Tag) se jodegi
    stock_item = models.ForeignKey(StockForSale, on_delete=models.CASCADE, related_name='multiple_images')
    image = models.ImageField(upload_to='Asclepius/stock_photos/angles/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)


    class Meta:
        db_table = 'stock_images'

#  modified for asclepius
# 💎 ITEM MASTER CONFIGURATION & INVENTORY CONTROL
# ==========================================
class ItemMaster(models.Model):
    id = models.AutoField(primary_key=True)
    item_group = models.CharField(max_length=40)
    item_name = models.CharField(max_length=60, blank=True, null=True)
    reorder_level = models.IntegerField(default=20)
    remarks = models.TextField(blank=True, null=True)

    available_quantity = models.DecimalField(max_digits=4, decimal_places=0, db_column='available_quantity', blank=True, null=True)
    tag_text = models.CharField(max_length=40, db_column='TagText', unique=True, default='-') # TagID ke liye query chalane me kaam aayega
    mrp = models.DecimalField(max_digits=10, decimal_places=2, db_column='MRP', blank=True, null=True)
    dp = models.DecimalField(max_digits=10, decimal_places=2, db_column='DP', blank=True, null=True)
    sp = models.DecimalField(max_digits=10, decimal_places=2, db_column='SP', blank=True, null=True)
   
    flag1 = models.CharField(max_length=20, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=20, db_column='Flag2', blank=True, null=True)
    flag3 = models.CharField(max_length=20, db_column='Flag3', blank=True, null=True)

    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)


    class Meta:
        db_table = 'item_master'

    def __str__(self):
        return f"{self.item_group} - {self.item_name or 'N/A'} (Tag: {self.tag_text})"
# -----------------------------------------------------------------------------------------------------

from django.db import models

class Customers(models.Model):
    # MySQL me auto-increment ID ke liye AutoField
    id = models.AutoField(primary_key=True) 
    cname = models.CharField(max_length=255, db_column='CName', blank=True, null=True)
    mobile1 = models.CharField(max_length=20, db_column='Mobile1', blank=True, null=True)
    mobile2 = models.CharField(max_length=20, db_column='Mobile2', blank=True, null=True)
    email = models.CharField(max_length=255, db_column='Email', blank=True, null=True)
    address = models.TextField(db_column='Address', blank=True, null=True)
    referance = models.CharField(max_length=255, db_column='Referance', blank=True, null=True)
    remarks = models.TextField(db_column='Remarks', blank=True, null=True)
    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    acc = models.CharField(max_length=100, db_column='Acc', blank=True, null=True)
    status = models.CharField(max_length=50, db_column='Status', blank=True, null=True)
    
    # 🔥 Running Balance ke liye main field (Purnank me rahega, hamesha default 0)
    credit = models.IntegerField(db_column='Credit', default=0)

    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)


    class Meta:
        db_table = 'Customers'  # MySQL database ke andar table ka naam 'Customers' rahega
        managed = True          # Django is table ko manage karega

    def __str__(self):
        return f"{self.cname} - Udhaar Baaki: {self.credit}"

# 📢 Collection Page ke liye Dynamic Offer Banner Model
class OfferBanner(models.Model):
    offer_text = models.CharField(max_length=255, help_text="Yahan offer ka message likhein (e.g., Diwali Special: 10% OFF on Making Charges!)")
    is_active = models.BooleanField(default=False, help_text="Kya is offer ko frontend par chalana hai?")
    created_at = models.DateTimeField(auto_now_add=True)

    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)


    class Meta:
        db_table = 'offer_banner'

    def __str__(self):
        return f"{self.offer_text} - ({'Active' if self.is_active else 'Inactive'})"


from django.db import models
from django.utils import timezone

class ReceiptVoucher(models.Model):
    # R_ID (Number/AutoField)
    r_id = models.AutoField(primary_key=True)
    
    # onDate (Date/Time)
    on_date = models.DateTimeField(default=timezone.now)
    
    # Customer_ID (Number)
    customer_id = models.IntegerField()
    
    # Customer_Name (Text)
    customer_name = models.CharField(max_length=255)
    
    # Paid_In (Text)
    paid_in = models.CharField(max_length=100)
    
    # Amount (Number)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # ForBillNo (Text)
    for_bill_no = models.CharField(max_length=100, blank=True, null=True)
    
    # Remarks (Text)
    remarks = models.TextField(blank=True, null=True)
    
    # ReceivedBy (Text)
    received_by = models.CharField(max_length=100, default='Admin')

    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)


    def __str__(self):
        return f"Receipt {self.r_id} - {self.customer_name}"

        # ==========================================


class SalesOrder(models.Model):
    slno = models.AutoField(primary_key=True, db_column='SlNo')
    tag_id = models.CharField(max_length=100, db_column='TagID')
    item_name = models.CharField(max_length=150, db_column='ItemName', blank=True, null=True)
    customer_name = models.CharField(max_length=100, db_column='CustomerName')
    customer_mobile = models.CharField(max_length=15, db_column='CustomerMobile')
    
    # User Profile details
    asclepius_id = models.CharField(max_length=100, db_column='AsclepiusID', blank=True, null=True)
    customer_address = models.TextField(db_column='CustomerAddress', blank=True, null=True)
    
    # Quantity and Price
    order_qty = models.IntegerField(db_column='OrderQty', default=1)
    order_rate = models.DecimalField(max_digits=12, decimal_places=2, db_column='OrderRate', default=0.0)

    # Do tarah ke remarks jise humne discuss kiya tha
    customer_remarks = models.TextField(db_column='CustomerRemarks', blank=True, null=True)
    seller_remarks = models.TextField(db_column='SellerRemarks', blank=True, null=True)
    
    # Process Status Tracking
    status = models.CharField(max_length=20, db_column='Status', default='Pending')
    order_number = models.CharField(max_length=100, db_column='OrderNumber', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column='CreatedAt')

    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)


    class Meta:
        db_table = 'sales_orders'  # Database table name

    def __str__(self):
        return f"Enquiry #{self.slno} - {self.tag_id}"

# ==========================================
# 🛡️ OTP & WHATSAPP AUTHENTICATION MODEL
# ==========================================
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=15, help_text="Format: +91XXXXXXXXXX (With Country Code)")
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"{self.user.username} - {self.phone_number}"


class EstimatedSales(models.Model):
    invoice = models.IntegerField(blank=True, null=True)
    customer = models.CharField(max_length=60, blank=True, null=True)
    addresses = models.CharField(max_length=160, blank=True, null=True)
    payment_mode = models.CharField(max_length=20, blank=True, null=True)

    bill_date = models.DateField(blank=True, null=True)
    item_id = models.CharField(max_length=8, blank=True, null=True)
    item_group = models.CharField(max_length=40, blank=True, null=True)
    item_name = models.CharField(max_length=60, blank=True, null=True)
    
    rate = models.IntegerField(blank=True, null=True)
    discount = models.IntegerField(blank=True, null=True)
    total = models.IntegerField(blank=True, null=True)
    
    remarks = models.CharField(max_length=40, blank=True, null=True)
    sold_by = models.CharField(max_length=40, blank=True, null=True)
    mobile = models.CharField(max_length=14, blank=True, null=True)
    email = models.CharField(max_length=60, blank=True, null=True)
    quantity = models.IntegerField(blank=True, null=True)
    
    asclepius_id = models.CharField(max_length=50, blank=True, null=True)
    g_tot = models.IntegerField(blank=True, null=True)
    bill_grand_total = models.IntegerField(blank=True, null=True)
    bill_sattlement_amt = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)

    flag1 = models.CharField(max_length=50, db_column='Flag1', blank=True, null=True)
    flag2 = models.CharField(max_length=50, db_column='Flag2', blank=True, null=True)
    firm_id = models.CharField(max_length=50, db_column='firm_id', blank=True, null=True)

    cash = models.DecimalField(max_digits=12, decimal_places=2, db_column='Cash', default=0.0, blank=True, null=True)
    credit = models.DecimalField(max_digits=12, decimal_places=2, db_column='Credit', default=0.0, blank=True, null=True)
    upi = models.DecimalField(max_digits=12, decimal_places=2, db_column='UPI', default=0.0, blank=True, null=True)


    class Meta:
        db_table = 'Estimated_sales' # Table name in MySQL

# Firm Profile
from django.db import models

class FirmProfile(models.Model):
    firm_name = models.CharField(max_length=100, default="Jewellers Online")
    proprietor_name = models.CharField(max_length=100, blank=True, null=True)
    
    tagline_1 = models.CharField(max_length=150, blank=True, null=True)
    tagline_2 = models.CharField(max_length=150, blank=True, null=True)
    
    address_line_1 = models.CharField(max_length=255, blank=True, null=True)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    
    phone_1 = models.CharField(max_length=20, blank=True, null=True)
    phone_2 = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=100, blank=True, null=True)
    
    website = models.URLField(max_length=100, blank=True, null=True)
    instagram_id = models.CharField(max_length=100, blank=True, null=True)
    facebook_id = models.CharField(max_length=100, blank=True, null=True)
    
    gstin_number = models.CharField(max_length=15, blank=True, null=True)
    invoice_prefix = models.CharField(max_length=10, default="INV")
    
    logo = models.ImageField(upload_to='Asclepius/firm_logos/', blank=True, null=True)
    bank_details = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.firm_name