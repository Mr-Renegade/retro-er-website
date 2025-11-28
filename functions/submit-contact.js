// Cloudflare Pages Function to handle contact form submissions
// This runs server-side to keep the API key secure

export async function onRequestPost(context) {
  const FORMBRICKS_API_KEY = 'fbk_bvBvPklAgXLOi-xSH7L14vy5hhuxPENwKBB_s7VMEXw';
  const FORMBRICKS_API_URL = 'https://app.formbricks.com/api/v1';
  const ENVIRONMENT_ID = 'cmiibd81f1ru9ad01ti4klf18';

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

    // Create response data for Formbricks
    const responseData = {
      environmentId: ENVIRONMENT_ID,
      userId: email, // Use email as user identifier
      finished: true,
      data: {
        name: name,
        email: email,
        device: device,
        message: message,
        timestamp: new Date().toISOString()
      }
    };

    // Submit to Formbricks API
    const formbricksResponse = await fetch(`${FORMBRICKS_API_URL}/client/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FORMBRICKS_API_KEY
      },
      body: JSON.stringify(responseData)
    });

    if (!formbricksResponse.ok) {
      const errorText = await formbricksResponse.text();
      console.error('Formbricks API error:', errorText);

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to submit to Formbricks'
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
      message: 'Form submitted successfully'
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
      error: 'Internal server error'
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
