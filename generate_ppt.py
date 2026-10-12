import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

def create_presentation():
    prs = Presentation()
    
    # Theme Colors
    DARK_BG = RGBColor(26, 26, 26)
    GOLD_TEXT = RGBColor(212, 175, 55) # #d4af37
    WHITE_TEXT = RGBColor(255, 255, 255)
    
    def set_slide_bg(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = DARK_BG

    # Slide 1: Title
    slide_layout = prs.slide_layouts[0] # Title slide
    slide = prs.slides.add_slide(slide_layout)
    set_slide_bg(slide)
    
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    
    title.text = "Asclepius Wellness Online Store"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    title.text_frame.paragraphs[0].font.bold = True
    
    subtitle.text = "A Complete Inventory, POS & Management System\nBuilt with React.js & Django"
    subtitle.text_frame.paragraphs[0].font.color.rgb = WHITE_TEXT

    # Slide 2: Core Overview
    slide_layout = prs.slide_layouts[1] # Title and Content
    slide = prs.slides.add_slide(slide_layout)
    set_slide_bg(slide)
    
    title = slide.shapes.title
    title.text = "Project Overview"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    
    content = slide.placeholders[1]
    tf = content.text_frame
    tf.text = "A modern, full-stack application designed to streamline business operations."
    tf.paragraphs[0].font.color.rgb = WHITE_TEXT
    
    bullets = [
        "Frontend: React.js (Fast, Responsive, SPA)",
        "Backend: Django (Secure, Scalable, REST APIs)",
        "Storage: Cloudinary (Cloud-based Image & Video processing)",
        "Database: MySQL / SQLite",
        "Key Focus: Billing, Inventory Tracking, and Customer Management"
    ]
    for bullet in bullets:
        p = tf.add_paragraph()
        p.text = bullet
        p.font.color.rgb = WHITE_TEXT
        p.level = 1

    # Slide 3: Smart POS & Billing
    slide = prs.slides.add_slide(slide_layout)
    set_slide_bg(slide)
    title = slide.shapes.title
    title.text = "1. Smart POS & Sales Voucher"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    
    tf = slide.placeholders[1].text_frame
    tf.text = "Comprehensive point-of-sale system for instant billing."
    tf.paragraphs[0].font.color.rgb = WHITE_TEXT
    bullets = [
        "Real-time calculations of Rate, Qty, Total, and SP (Sales Point).",
        "Multiple Payment Modes: Cash, Credit, UPI, and Cash+Credit.",
        "Automatic TSP (Total Sales Point) calculation in Cart.",
        "Customer ledger integration to auto-update Dues/Udhaari.",
        "One-click PDF Invoice generation with company logo."
    ]
    for bullet in bullets:
        p = tf.add_paragraph()
        p.text = bullet
        p.font.color.rgb = WHITE_TEXT
        p.level = 1

    # Slide 4: Inventory & Catalog
    slide = prs.slides.add_slide(slide_layout)
    set_slide_bg(slide)
    title = slide.shapes.title
    title.text = "2. Inventory & Product Catalog"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    
    tf = slide.placeholders[1].text_frame
    tf.text = "Efficient stock tracking and visual product browsing."
    tf.paragraphs[0].font.color.rgb = WHITE_TEXT
    bullets = [
        "Interactive 'Collection' page for customers to browse items.",
        "Dynamic sorting and filtering by Group and Item Name.",
        "Stock checking before adding items to Cart (prevents overselling).",
        "Cloudinary integration for lightning-fast image compression & uploads.",
        "Stock Register with Print Preview support."
    ]
    for bullet in bullets:
        p = tf.add_paragraph()
        p.text = bullet
        p.font.color.rgb = WHITE_TEXT
        p.level = 1

    # Slide 5: Enquiry & Workflow Automation
    slide = prs.slides.add_slide(slide_layout)
    set_slide_bg(slide)
    title = slide.shapes.title
    title.text = "3. Workflow Automation"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    
    tf = slide.placeholders[1].text_frame
    tf.text = "Seamless transition from Customer Enquiry to Final Sale."
    tf.paragraphs[0].font.color.rgb = WHITE_TEXT
    bullets = [
        "Guest users can build a Cart and submit it as an Enquiry.",
        "Admin Dashboard to manage Enquiries (Pending vs Done/Sold).",
        "1-Click 'Make Sales' button auto-converts Enquiry into a Sales Voucher.",
        "Auto-fills Customer Name, Asclepius ID, and Item details.",
        "Inactivity Screensaver: Auto-plays promotional videos on idle screens."
    ]
    for bullet in bullets:
        p = tf.add_paragraph()
        p.text = bullet
        p.font.color.rgb = WHITE_TEXT
        p.level = 1
        
    # Slide 6: SP Settlement & Analytics
    slide = prs.slides.add_slide(slide_layout)
    set_slide_bg(slide)
    title = slide.shapes.title
    title.text = "4. Analytics & SP Settlement"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    
    tf = slide.placeholders[1].text_frame
    tf.text = "Track business growth and agent performances."
    tf.paragraphs[0].font.color.rgb = WHITE_TEXT
    bullets = [
        "Dedicated 'Adjust SP' dashboard for Sponsor Points.",
        "Date-range filters (defaults to current month) with smart sorting.",
        "Track pending vs completed settlements.",
        "Supports 'Activation' and 'Repurchase' logic out-of-the-box."
    ]
    for bullet in bullets:
        p = tf.add_paragraph()
        p.text = bullet
        p.font.color.rgb = WHITE_TEXT
        p.level = 1

    # Slide 7: Conclusion
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    set_slide_bg(slide)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    
    title.text = "Ready for Scale"
    title.text_frame.paragraphs[0].font.color.rgb = GOLD_TEXT
    title.text_frame.paragraphs[0].font.bold = True
    
    subtitle.text = "Thank You\n(Generated dynamically by your AI Assistant)"
    subtitle.text_frame.paragraphs[0].font.color.rgb = WHITE_TEXT

    ppt_path = "Asclepius_Project_Features.pptx"
    prs.save(ppt_path)
    print(f"Presentation successfully created at: {os.path.abspath(ppt_path)}")

if __name__ == "__main__":
    create_presentation()
