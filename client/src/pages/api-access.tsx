import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, ExternalLink } from "lucide-react"
import ApiSection from "@/components/api-section"

const ApiAccess = () => {
  const apiKey = "sk_temp_87fe45ab123ced456789abcdef"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">API Access</h1>
          <p className="text-muted-foreground">Integrate TempMailGuard into your applications</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Your API Key</h2>
          <div className="bg-muted border border-border rounded-md p-3 font-mono text-sm flex justify-between items-center">
            <div className="truncate">{apiKey}</div>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(apiKey)} className="ml-2">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Keep this key secret. You can regenerate it at any time if it gets compromised.
          </p>

          <div className="mt-4 flex">
            <Button variant="outline" className="mr-2">
              Regenerate Key
            </Button>
            <Button>Upgrade for Higher Limits</Button>
          </div>
        </CardContent>
      </Card>

      <ApiSection />

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">API Documentation</h2>

          <Tabs defaultValue="nodejs" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>

            <TabsContent value="nodejs" className="bg-muted rounded-md p-4 overflow-x-auto">
              <pre className="text-foreground font-mono text-sm">
                <code>
                  {`// Node.js Example
const axios = require('axios');

async function verifyEmail(email) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.tempmailguard.com/v1/verify',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${apiKey}'
      },
      data: {
        email: email
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
}

// Usage
verifyEmail('user@example.com')
  .then(result => console.log(result))
  .catch(error => console.error(error));`}
                </code>
              </pre>
            </TabsContent>

            <TabsContent value="python" className="bg-muted rounded-md p-4 overflow-x-auto">
              <pre className="text-foreground font-mono text-sm">
                <code>
                  {`# Python Example
import requests

def verify_email(email):
    try:
        response = requests.post(
            'https://api.tempmailguard.com/v1/verify',
            json={'email': email},
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer ${apiKey}'
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error verifying email: {e}")
        raise

# Usage
result = verify_email('user@example.com')
print(result)`}
                </code>
              </pre>
            </TabsContent>

            <TabsContent value="php" className="bg-muted rounded-md p-4 overflow-x-auto">
              <pre className="text-foreground font-mono text-sm">
                <code>
                  {`<?php
// PHP Example
function verifyEmail($email) {
    $apiKey = '${apiKey}';
    $url = 'https://api.tempmailguard.com/v1/verify';
    
    $data = json_encode(['email' => $email]);
    
    $options = [
        'http' => [
            'header' => "Content-Type: application/json\\r\\n" .
                        "Authorization: Bearer " . $apiKey . "\\r\\n",
            'method' => 'POST',
            'content' => $data
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    if ($result === FALSE) {
        return ['error' => 'Error verifying email'];
    }
    
    return json_decode($result, true);
}

// Usage
$result = verifyEmail('user@example.com');
print_r($result);
?>`}
                </code>
              </pre>
            </TabsContent>

            <TabsContent value="curl" className="bg-muted rounded-md p-4 overflow-x-auto">
              <pre className="text-foreground font-mono text-sm">
                <code>
                  {`# cURL Example
curl -X POST https://api.tempmailguard.com/v1/verify \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{"email": "user@example.com"}'`}
                </code>
              </pre>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">Response Format</h3>
            <div className="bg-muted rounded-md p-4 overflow-x-auto">
              <pre className="text-foreground font-mono text-sm">
                <code>
                  {`{
  "email": "user@example.com",
  "isTempEmail": false,
  "trustScore": 85,
  "domainAge": "more than 10 years",
  "hasMxRecords": true,
  "patternMatch": "No suspicious patterns"
}`}
                </code>
              </pre>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              Full API Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default ApiAccess

