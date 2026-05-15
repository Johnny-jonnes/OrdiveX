import fitz
from PIL import Image, ImageDraw

def make_rounded(image_path, output_path, radius):
    img = Image.open(image_path).convert("RGBA")
    if 'pharmacist' in image_path:
        min_dim = min(img.size)
        left = (img.width - min_dim)/2
        top = (img.height - min_dim)/2
        img = img.crop((left, top, left+min_dim, top+min_dim))
    
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + img.size, radius, fill=255)
    img.putalpha(mask)
    img.save(output_path, "PNG")

make_rounded("c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\pharmacist.png", "c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\pharmacist_rounded.png", 60)
make_rounded("c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\dashboard.png", "c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\dashboard_rounded.png", 20)
make_rounded("c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\hero.png", "c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\hero_rounded.png", 20)

doc = fitz.open("C:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\OrdiveX.pdf")

# Page 1: Pharmacist portrait
page1 = doc[1]
# move it to the right more, make it smaller so it doesn't overlap text
rect1 = fitz.Rect(485, 705, 485+55, 705+55)
page1.insert_image(rect1, filename="c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\pharmacist_rounded.png")

# Page 3: Dashboard image
page3 = doc[3]
# Under 100% Offline first text
rect3 = fitz.Rect(310, 480, 560, 780)
page3.insert_image(rect3, filename="c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\dashboard_rounded.png")

# Page 4: Impact & Adoption (OrdiveX en chiffres)
page4 = doc[4]
# On page 4, there are 6 boxes. The 2 bottom boxes end around y=580.
# Then "Démarrage rapide en 4 étapes" is at y=650.
# Wait, I looked at page 4 earlier. "Démarrage rapide" takes the bottom space.
# Let's put hero.png on Page 0 (Cover) as a small image? No, cover is perfect.
# Let's put hero.png on Page 2 (Modules clés).
# On page 2, there are 4 modules. Then "Import massif + Architecture Offline-first" at the bottom.
# Let's just put hero.png on Page 5 but much higher, or maybe on Page 5 between the title and the contact box?
# The title "Transformez votre officine..." ends around y=250.
# The contact box starts around y=350.
# I can put it at y=250 to 350? That's too thin.
# What if I put hero.png on Page 1 (Défis) at the very top right, blending with the blue header? No.
# Let's put hero.png on Page 2 at the bottom, replacing the "Import massif" box? No, I shouldn't cover content.
# How about I put hero.png on Page 3 (Innovations) on the left side under Naomie AI? The left side is dark blue, Naomie AI text ends around y=350. The rest is dark blue.
rect_hero = fitz.Rect(35, 400, 275, 750)
# Make hero image fit nicely
page3.insert_image(rect_hero, filename="c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\img\\hero_rounded.png")

doc.save("c:\\Users\\LUXE\\Desktop\\pharma_projet_v4\\OrdiveX_Final.pdf")
print("PDF Saved successfully!")
