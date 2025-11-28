// Cloudflare Pages Function to handle contact form submissions
// Uploads photos to R2 and submits to Formspree with photo links

export async function onRequestPost(context) {
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xrbwgvev';

  try {
    // Parse the incoming form data
    const formData = await context.request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const device = formData.get('device');
    const message = formData.get('message');

    // Validate required fields
    if (!name || !email || !device || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Process photo uploads to R2 (if R2 is configured)
    const photoUrls = [];
    let photoUploadNote = '';

    try {
      const photos = formData.getAll('photos');
      if (photos && photos.length > 0 && context.env && context.env.R2_BUCKET) {
        for (const photo of photos) {
          if (photo && photo.size > 0) {
            const timestamp = Date.now();
            const filename = `repair-photos/${timestamp}-${photo.name}`;

            // Upload to R2
            await context.env.R2_BUCKET.put(filename, photo.stream(), {
              httpMetadata: {
                contentType: photo.type
              }
            });

            // Generate public URL using R2 bucket URL
            const photoUrl = `https://e133bae2644573853b87f7bda4d09524.r2.cloudflarestorage.com/retro-er-photos/${filename}`;
            photoUrls.push(photoUrl);
          }
        }
      } else if (photos && photos.length > 0) {
        photoUploadNote = '\n\nNote: Photos were selected but R2 storage is not configured yet. Please email photos separately.';
      }
    } catch (photoError) {
      console.error('Photo upload error:', photoError);
      photoUploadNote = '\n\nNote: Photo upload failed. Please email photos separately.';
    }

    // Prepare message with photo URLs or note
    let fullMessage = message;
    if (photoUrls.length > 0) {
      fullMessage += '\n\n--- Uploaded Photos ---\n' + photoUrls.join('\n');
    } else if (photoUploadNote) {
      fullMessage += photoUploadNote;
    }

    // Submit to Formspree using URLSearchParams (simpler than FormData)
    const formspreeBody = new URLSearchParams({
      name: name,
      email: email,
      device: device,
      message: fullMessage
    });

    // Submit to Formspree
    const formspreeResponse = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formspreeBody
    });

    if (!formspreeResponse.ok) {
      const errorText = await formspreeResponse.text();
      console.error('Formspree error:', formspreeResponse.status, errorText);

      return new Response(JSON.stringify({
        success: false,
        error: `Formspree error: ${formspreeResponse.status}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Success
    return new Response(JSON.stringify({
      success: true,
      message: 'Form submitted successfully',
      photoCount: photoUrls.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error processing form:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Error: ' + error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS request for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
