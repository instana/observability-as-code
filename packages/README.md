# Contribution Guide

This project hosts customer-specific elements like dashboards and events for IBM Instana monitoring, bundled into integration packages.

## Steps to Contribute

### 1. Clone the repository:
Clone this repository and areate a dev branch based on `main`.

   ```shell
   git clone https://github.com/instana/observability-as-code.git
   ```

### 2. **Create a new package:**
Under `packages/`, create a new directory (e.g. `@instana-integration/packagename`). It should contain:

   ```shell
   packages/@instana-integration/packagename/
   ├── dashboards/
   │   └── my-dashboard.json
   ├── events/
   │   └── my-event.json
   └── package.json
   ```
   
### 3. Build custom elements: 

   * Define custom elements in the Instana UI
   * Export custom elements from Instana UI to your local
   * Set access rules to GLOBAL in dashboards for public sharing

### 4. Create package.json:
Create package.json file init command and include required fields

   ```shell
   {
       "name": "@instana-integration/package-name",
       "version": "1.0.0",
       "description": "Custom monitoring for XYZ systems.",
       "author": "author",
       "license": "MIT"
   }
   ```

### 5. Create a Pull Request:
- Commit and push your changes
- Open a PR against the `main` branch

### 6. Automated Publishing:
After your PR is reviewed and merged into main, the GitHub workflow will automatically publish your package to [Instana integration organization](https://www.npmjs.com/org/instana-integration).


## 📚 Learn More

- [Blog: Making Your Instana Dashboards Publicly Sharable](https://community.ibm.com/community/user/blogs/ying-mo2/2025/02/22/making-your-instana-dashboards-publicly-sharable)
- [Blog: Contributing to IBM Instana Observability as Code GitHub Repository](https://community.ibm.com/community/user/blogs/ying-mo2/2025/03/09/contributing-to-ibm-instana-observability-as-code)

