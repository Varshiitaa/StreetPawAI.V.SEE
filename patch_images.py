import sqlite3

con = sqlite3.connect('backend/streetpaw.db')
cur = con.cursor()
valid_img = '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg'

cur.execute("UPDATE complaints SET photo = ? WHERE photo IS NULL OR photo = '' OR photo LIKE '%/DOG_001.jpg'", (valid_img,))
print('Complaints updated:', cur.rowcount)

cur.execute("UPDATE lost_found_posts SET photo = ? WHERE photo IS NULL OR photo = '' OR photo = 'MISSING'", (valid_img,))
print('Lost found posts updated:', cur.rowcount)

con.commit()
con.close()
print('Database images patched successfully.')
