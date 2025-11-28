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
    const photos = formData.getAll('photos');

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
    if (photos && photos.length > 0 && context.env.R2_BUCKET) {
      for (const photo of photos) {
        if (photo && photo.size > 0) {
          try {
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
          } catch (err) {
            console.error('Error uploading photo:', err);
          }
        }
      }
    }

    // Create form data for Formspree
    const formspreeData = new FormData();
    formspreeData.append('name', name);
    formspreeData.append('email', email);
    formspreeData.append('device', device);

    // Add photo URLs to message
    let fullMessage = message;
    if (photoUrls.length > 0) {
      fullMessage += '\n\n--- Uploaded Photos ---\n' + photoUrls.join('\n');
    }
    formspreeData.append('message', fullMessage);

    // Submit to Formspree
    const formspreeResponse = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body: formspreeData
    });

    if (!formspreeResponse.ok) {
      const errorText = await formspreeResponse.text();
      console.error('Formspree error:', errorText);

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to submit form'
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
      error: 'Internal server error: ' + error.message
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
