from django.urls import path
from .views import customers_views
from .views import receipt_views  
from .views.receipt_views import view_saved_receipt_pdf
from .views.sales_views import get_sales_data, get_sales_register, view_saved_invoice_pdf
from .views.sales_views_new import save_invoice_mysql, get_next_invoice_no
from .views import share_views
from .views.enquiry_views import save_customer_enquiry, save_bulk_customer_enquiry, get_enquiries_list, update_enquiry_status, delete_sales_order
from store.views import firm_profile_views

# 🔥 Aligned Stock Imports
from .views.stock_views import (
    get_stock_by_tag, 
    get_next_tag_id, 
    save_bulk_stock, 
    get_tagwise_stock_report, 
    upload_stock_image, 
    delete_single_stock_image,
    get_active_offer,            
    update_offer_from_frontend,
    update_single_stock,
    get_sales_catalog
)

from .views.item_master_views import (
    save_or_update_master_item,
    get_all_master_items,
    get_dropdown_master_data,
    update_item_flag
)

# Folder structure ke hisab se import:
from store.views.auth_views import initiate_login_view, verify_otp_view
from store.views.sp_views import get_sp_settlements, update_sp_settlement_status

urlpatterns = [
    path('api/sp-settlements/', get_sp_settlements, name='get_sp_settlements'),
    path('api/sp-settlements/update/', update_sp_settlement_status, name='update_sp_settlement_status'),

    # 🛍️ Sales Routes
    path('sales/', get_sales_data, name='get_sales_data'),
    path('api/sales/catalog/', get_sales_catalog, name='get_sales_catalog'),
    path('api/save-invoice/', save_invoice_mysql, name='save_invoice_mysql'),
    path('store/save_invoice_mysql/', save_invoice_mysql, name='save_invoice_mysql_alt'),
    path('api/get_next_invoice_no/', get_next_invoice_no, name='get_next_invoice_no'),
    path('api/sales-register/', get_sales_register, name='get_sales_register'),
    path('api/sales/view-pdf/<str:invoice_no>/', view_saved_invoice_pdf, name='view_saved_invoice_pdf'),

    # 💎 Stock Routes
    path('api/get_stock_by_tag/', get_stock_by_tag, name='get_stock_by_tag'),
    path('api/get_next_tag_id/', get_next_tag_id, name='get_next_tag_id'),
    path('api/save_bulk_stock/', save_bulk_stock, name='save_bulk_stock'),
    path('api/update_single_stock/', update_single_stock, name='update_single_stock'),
    path('api/stock-report/', get_tagwise_stock_report, name='get_tagwise_stock_report'),
    path('api/delete-stock-image/', delete_single_stock_image, name='delete_stock_image'),
    path('api/upload-stock-image/', upload_stock_image, name='upload_stock_image'),

    # 👥 Customers Routes 
    path('api/customers/add/', customers_views.add_customer, name='add_customer'),
    path('api/customers/ledger/<int:customer_id>/', customers_views.get_customer_ledger, name='customer_ledger'),
    path('api/get_customers/', customers_views.get_customers, name='get_customers'),
    path('api/customers/delete/<int:customer_id>/', customers_views.delete_customer, name='delete_customer'),
    path('api/customers/ensure-from-order/', customers_views.ensure_customer_from_order, name='ensure_customer_from_order'),

    # 📢 Offer Banner Control Routes
    path('api/get-active-offer/', get_active_offer, name='get_active_offer'),
    path('api/update-offer/', update_offer_from_frontend, name='update_offer_from_frontend'),

    # 🧾 Receipts Vouchers Endpoints 
    path('api/receipts/initial-data/', receipt_views.get_receipt_initial_data, name='get_receipt_initial_data'),
    path('api/receipts/save/', receipt_views.save_receipt_voucher, name='save_receipt_voucher'),
    path('api/receipts/register/', receipt_views.get_receipt_register, name='get_receipt_register'),
    path('api/receipts/register/pdf/', receipt_views.get_receipt_register_pdf, name='get_receipt_register_pdf'),
    path('api/receipts/view-pdf/<int:r_id>/', view_saved_receipt_pdf, name='view_saved_receipt_pdf'),

    # 📋 Dynamic Item Master URLs (Pointed to item_master_views)
    path('api/master/save/', save_or_update_master_item, name='save_or_update_master_item'),
    path('api/master/all/', get_all_master_items, name='get_all_master_items'),
    path('api/master/dropdowns/', get_dropdown_master_data, name='get_dropdown_master_data'),
    path('api/master/update-flag/', update_item_flag, name='update_item_flag'),
   
    # 🛒 Customer Enquiries Routes
    path('api/sales-order/save/', save_customer_enquiry, name='save_customer_enquiry'),
    path('api/sales-order/save-bulk/', save_bulk_customer_enquiry, name='save_bulk_customer_enquiry'),
    path('api/sales-order/list/', get_enquiries_list, name='get_enquiries_list'),
    path('api/sales-order/update-status/', update_enquiry_status, name='update_enquiry_status'),
    path('api/sales-order/delete/<str:order_number>/', delete_sales_order, name='delete_sales_order'),

    # 🔐 WhatsApp 2FA Login Endpoints
    path('api/login/', initiate_login_view, name='initiate_login'),
    path('api/verify-otp/', verify_otp_view, name='verify_otp'),

    # 📱 WhatsApp On-Demand PDF Sharing
    path('api/share/get-pdf-link/', share_views.get_or_create_pdf_share_link, name='get_or_create_pdf_share_link'),

    path('api/firm-profile/', firm_profile_views.get_firm_profile, name='get_firm_profile'),
]
