import os, django
import sys
sys.path.append(r'E:\AsclepiusOnlineStore\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

def fix_table(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW COLUMNS FROM {table_name}")
        cols = [r[0] for r in cursor.fetchall()]
        
        if 'metal' not in cols:
            print(f"Skipping data shift for {table_name} because 'metal' column not found.")
            return

        print(f"Applying data shift on {table_name}...")
        
        # Shift data
        update_query = f"""
        UPDATE {table_name} SET
            payment_mode = addresses,
            addresses = customer,
            customer = metal,
            
            bill_sattlement_amt = bill_grand_total,
            bill_grand_total = bill_date,
            bill_date = bill_cash,
            
            quantity = item_name,
            item_name = item_group,
            item_group = email,
            email = date_orig,
            
            mobile = item_id,
            item_id = g_tot,
            
            rate = making;
        """
        try:
            cursor.execute(update_query)
            print(f"Data shifted successfully for {table_name}.")
        except Exception as e:
            print(f"Error shifting data for {table_name}: {e}")

        # Rename sgst to asclepius_id if it exists
        if 'sgst' in cols and 'asclepius_id' not in cols:
            try:
                cursor.execute(f"ALTER TABLE {table_name} RENAME COLUMN sgst TO asclepius_id;")
                print(f"Renamed sgst to asclepius_id in {table_name}.")
            except Exception as e:
                # Fallback for older MySQL versions
                try:
                    cursor.execute(f"ALTER TABLE {table_name} CHANGE sgst asclepius_id VARCHAR(50);")
                    print(f"Renamed sgst to asclepius_id in {table_name} using CHANGE.")
                except Exception as e2:
                    print(f"Error renaming sgst: {e2}")

        # Delete columns
        cols_to_drop = ['metal', 'bill_bank', 'bill_cash', 'category', 'cgst', 'date_orig', 'purity', 'making', 'weight']
        for col in cols_to_drop:
            if col in cols:
                try:
                    cursor.execute(f"ALTER TABLE {table_name} DROP COLUMN {col};")
                    print(f"Dropped {col} from {table_name}.")
                except Exception as e:
                    print(f"Error dropping {col}: {e}")

fix_table('sales')
fix_table('Estimated_sales')
print("Database fix completed.")
