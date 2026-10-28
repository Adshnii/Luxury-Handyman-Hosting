# Luxury Handyman Company — production website

Publication URL: https://luxuryhandymansolvix.com/

This repository is the production source for the owner-approved static company website. GitHub Pages publishes the `main` branch from `/`. `.nojekyll` disables Jekyll. No build dependencies or backend server are required.

- Original design repository: https://github.com/Adshnii/Web-Luxury-Handyman-Company
- Private operations and website information: https://github.com/Adshnii/Luxury-Handyman-Website-Info
- Approved design baseline: `9c590352b3b7ac8ccf99f3358d3220df17e4db12` (2026-10-23 approval).

## Updating the live website

Edit this repository: `index.html` for content, `styles.css` for presentation, `script.js` for navigation and the email helper, and `assets/` for images. Commits to `main` trigger publication. The original design repository does not automatically synchronize into this one. Revert a commit to roll back, then check the Pages deployment and published site.

The contact form prepares a message in the visitor's email application; it does not send automatically or store requests. This site has no checkout, payment processing, customer accounts or database.

The custom domain `luxuryhandymansolvix.com` is configured in Pages and CNAME. Namecheap web DNS points to GitHub; existing Spacemail records are preserved. Current domain and search-indexing status is recorded in the private information repository.

## Assets

Company logo: owner-approved artwork. Interior photograph: illustrative image from https://images.unsplash.com/photo-1600210492486-724fe5c67fb0 , labeled “Interior inspiration”; it is not a completed company project. Fonts: Google Fonts Inter and Playfair Display with system fallbacks.

Do not commit credentials, private client details or billing records. Important operations documentation belongs in the private information repository.

## Contact update — 2026-10-27

The prepared message contains only the company greeting and the visitor’s message. The current production form still opens an email client. The owner selected the existing Spacemail mailbox for SMTP delivery. A tested backend draft is in `server/`; hosting and secure credential setup are still pending. FormSubmit was declined and is not integrated. Service descriptions exclude licensed electrical and plumbing work based on the owner’s confirmation.
