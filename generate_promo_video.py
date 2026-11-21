import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

output_file = 'store_assets/zeroweb_ai_promo_video.mp4'
width, height = 1920, 1080
fps = 30
total_frames = 540  # 18 seconds

# Setup video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_file, fourcc, float(fps), (width, height))

# Load base logo
base_icon = Image.open('extension/assets/icons/icon128.png')

# Fonts
try:
    font_hero = ImageFont.truetype('arial.ttf', 72)
    font_h1 = ImageFont.truetype('arial.ttf', 56)
    font_h2 = ImageFont.truetype('arial.ttf', 38)
    font_body = ImageFont.truetype('arial.ttf', 28)
    font_tag = ImageFont.truetype('arial.ttf', 24)
except Exception:
    font_hero = font_h1 = font_h2 = font_body = font_tag = None

def get_text_size(draw, text, font):
    if font:
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]
    return len(text) * 15, 30

for f in range(total_frames):
    img = Image.new('RGB', (width, height), (7, 10, 16))
    d = ImageDraw.Draw(img)

    # Ambient radial gradient
    glow_r = 350 + int(30 * np.sin(f * 0.08))
    d.ellipse(
        [width // 2 - glow_r, height // 2 - glow_r, width // 2 + glow_r, height // 2 + glow_r],
        fill=(22, 10, 18)
    )

    # =========================================================================
    # SCENE 1: (0s - 3.5s) Title Reveal
    # =========================================================================
    if f < 105:
        logo_sz = int(140 + 20 * min(1.0, f / 40.0))
        icon_curr = base_icon.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
        im_x = (width - logo_sz) // 2
        im_y = 280
        img.paste(icon_curr, (im_x, im_y), icon_curr)

        t_w, _ = get_text_size(d, 'ZeroWeb AI', font_hero)
        d.text(((width - t_w) // 2, 480), 'ZeroWeb AI', fill=(255, 255, 255), font=font_hero)

        s_text = 'Block All AI. Pure Web.'
        s_w, _ = get_text_size(d, s_text, font_h2)
        d.text(((width - s_w) // 2, 590), s_text, fill=(244, 63, 94), font=font_h2)

        b_text = 'Manifest V3 Native Shield'
        b_w, _ = get_text_size(d, b_text, font_tag)
        d.rounded_rectangle(
            [(width - b_w) // 2 - 20, 680, (width + b_w) // 2 + 20, 725],
            radius=20,
            fill=(15, 23, 42),
            outline=(56, 189, 248),
            width=1
        )
        d.text(((width - b_w) // 2, 690), b_text, fill=(56, 189, 248), font=font_tag)

    # =========================================================================
    # SCENE 2: (3.5s - 7.5s) Search AI Overview Purge
    # =========================================================================
    elif f < 225:
        sub_f = f - 105
        top_txt = '1. Eliminates Search AI Overviews & Distractions'
        t_w, _ = get_text_size(d, top_txt, font_h1)
        d.text(((width - t_w) // 2, 90), top_txt, fill=(255, 255, 255), font=font_h1)

        card_rect = [320, 200, 1600, 920]
        d.rounded_rectangle(card_rect, radius=18, fill=(13, 19, 31), outline=(30, 41, 59), width=2)

        d.rounded_rectangle([360, 230, 1560, 280], radius=12, fill=(22, 30, 46))
        d.text((390, 245), 'google.com/search?q=best+python+course', fill=(148, 163, 184), font=font_tag)

        if sub_f < 60:
            d.rounded_rectangle([360, 310, 1560, 480], radius=14, fill=(26, 18, 30), outline=(225, 29, 72), width=2)
            d.text((400, 335), 'AI Overview (Unverified Hallucinations)', fill=(244, 63, 94), font=font_body)
            d.text((400, 385), 'Python was created in 1991. Try memorizing every library at once...', fill=(203, 213, 225), font=font_body)
            d.text((400, 425), 'Loading random unverified answers that waste your cognitive focus...', fill=(148, 163, 184), font=font_tag)

            if sub_f > 40:
                laser_x = 360 + int((sub_f - 40) / 20.0 * 1200)
                d.line([laser_x, 310, laser_x, 480], fill=(244, 63, 94), width=6)
        else:
            d.rounded_rectangle([360, 310, 960, 360], radius=8, fill=(16, 185, 129), outline=(16, 185, 129), width=1)
            d.text((380, 323), 'AI Overview Blocked & Hidden (Zero-FOUC)', fill=(11, 15, 25), font=font_tag)

        res_y = 510 if sub_f < 60 else 390
        d.text((360, res_y), 'https://www.python.org > doc', fill=(100, 116, 139), font=font_tag)
        d.text((360, res_y + 30), 'The Python Tutorial - Python 3.13 Documentation', fill=(56, 189, 248), font=font_h2)
        d.text((360, res_y + 80), 'Python is an easy to learn, powerful language maintained by human developers.', fill=(203, 213, 225), font=font_body)

        d.text((360, res_y + 150), 'https://docs.python-guide.org', fill=(100, 116, 139), font=font_tag)
        d.text((360, res_y + 180), 'The Hitchhikers Guide to Python - Best Practices', fill=(56, 189, 248), font=font_h2)

    # =========================================================================
    # SCENE 3: (7.5s - 11.5s) Standalone Platform & .ai Interception
    # =========================================================================
    elif f < 345:
        sub_f = f - 225
        top_txt = '2. Blocks 40+ AI Platforms & All .ai Domains'
        t_w, _ = get_text_size(d, top_txt, font_h1)
        d.text(((width - t_w) // 2, 90), top_txt, fill=(255, 255, 255), font=font_h1)

        card_box = [620, 220, 1300, 780]
        d.rounded_rectangle(card_box, radius=24, fill=(15, 23, 42), outline=(225, 29, 72), width=3)

        icon_c3 = base_icon.resize((120, 120), Image.Resampling.LANCZOS)
        img.paste(icon_c3, (890, 280), icon_c3)

        d.text((800, 440), 'BLOCKED', fill=(255, 255, 255), font=font_hero)

        domain_list = ['https://manus.ai', 'https://chatgpt.com', 'https://claude.ai', 'https://grok.com', 'https://deepseek.com']
        active_dom = domain_list[(sub_f // 24) % len(domain_list)]

        d.rounded_rectangle([720, 560, 1200, 620], radius=12, fill=(11, 15, 25), outline=(56, 189, 248), width=1)
        dom_w, _ = get_text_size(d, active_dom, font_h2)
        d.text(((width - dom_w) // 2, 572), active_dom, fill=(56, 189, 248), font=font_h2)

        d.text((690, 670), 'Auto-redirected at the browser engine level', fill=(148, 163, 184), font=font_body)

    # =========================================================================
    # SCENE 4: (11.5s - 15.0s) Universal In-Page AI Agent Purger
    # =========================================================================
    elif f < 450:
        top_txt = '3. Purges In-Page AI Agents on ANY Website'
        t_w, _ = get_text_size(d, top_txt, font_h1)
        d.text(((width - t_w) // 2, 90), top_txt, fill=(255, 255, 255), font=font_h1)

        cards = [
            ('Notion & Canva AI', 'Auto-strips Write with AI and floating assist prompts.'),
            ('Support Chatbots', 'Hides Intercom Fin, Drift, Tidio, Chatbase & Kapa bots.'),
            ('Atlassian & Figma', 'Eliminates Rovo, Jira AI, and canvas AI action menus.'),
            ('1-Click Whitelist', 'Instantly allow any website with 1 click in toolbar.')
        ]

        coords = [
            [300, 240, 920, 480],
            [1000, 240, 1620, 480],
            [300, 530, 920, 770],
            [1000, 530, 1620, 770]
        ]

        for i, (title, desc) in enumerate(cards):
            d.rounded_rectangle(coords[i], radius=16, fill=(15, 23, 42), outline=(30, 41, 59), width=2)
            d.text((coords[i][0] + 40, coords[i][1] + 40), f'✓  {title}', fill=(255, 255, 255), font=font_h2)
            d.text((coords[i][0] + 40, coords[i][1] + 110), desc, fill=(148, 163, 184), font=font_body)

    # =========================================================================
    # SCENE 5: (15.0s - 18.0s) CTA & Outro
    # =========================================================================
    else:
        icon_end = base_icon.resize((150, 150), Image.Resampling.LANCZOS)
        img.paste(icon_end, ((width - 150) // 2, 230), icon_end)

        c_text = 'Take Back Your Web Experience'
        c_w, _ = get_text_size(d, c_text, font_hero)
        d.text(((width - c_w) // 2, 440), c_text, fill=(255, 255, 255), font=font_hero)

        btn_w, btn_h = 560, 90
        btn_x = (width - btn_w) // 2
        btn_y = 570
        d.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=18, fill=(225, 29, 72))
        btn_text = 'Add to Chrome - Free'
        b_tw, _ = get_text_size(d, btn_text, font_h1)
        d.text(((width - b_tw) // 2, btn_y + 15), btn_text, fill=(255, 255, 255), font=font_h1)

        url_txt = 'https://zeroaiweb.netlify.app/'
        u_w, _ = get_text_size(d, url_txt, font_h2)
        d.text(((width - u_w) // 2, 720), url_txt, fill=(56, 189, 248), font=font_h2)

    frame_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    out.write(frame_bgr)

out.release()
print(f'Finished video generation: {output_file} ({os.path.getsize(output_file)} bytes)')

