type BaseEmailTemplateParams = {
  appName: string;
  title: string;
  bodyHtml: string;
  footerText?: string;
};

export const renderBaseEmailTemplate = (
  params: BaseEmailTemplateParams,
): string => {
  const footerText = params.footerText ?? `${params.appName}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${params.title}</title>
  </head>
  <body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e7e9f0;">
        <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">${params.appName}</div>
        <div style="font-size:20px;color:#111827;font-weight:700;margin-bottom:16px;">${params.title}</div>
        <div style="font-size:14px;color:#111827;line-height:1.6;">${params.bodyHtml}</div>
      </div>
      <div style="font-size:12px;color:#6b7280;padding:16px 8px;">${footerText}</div>
    </div>
  </body>
</html>`;
};
