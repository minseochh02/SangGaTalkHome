export default function KioskTutorialPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Kiosk Usage Tutorial</h1>
        <p className="text-md text-gray-600 mt-2">
          This tutorial guides both customers and store owners on how to use the Kiosk feature.
        </p>
      </header>

      {/* Customer Tutorial Section */}
      <section className="mb-12">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-300">
          Customer Tutorial: Ordering Through the Kiosk
        </h2>
        <p className="mb-6 text-gray-600">
          Follow these steps to easily place your order using our kiosk system.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">1. Accessing the Kiosk</h3>
            <p className="text-gray-600 mb-3">You can access a store's kiosk in two ways:</p>
            <div className="ml-4 space-y-4">
              <div>
                <h4 className="text-lg font-medium text-gray-700">Method A: In-App/Website Navigation</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                  <li>Start by browsing stores or categories within our app or on our website.</li>
                  <li>Select the store you wish to order from.</li>
                  <li>On the store's page, look for and tap the <strong>"키오스크 페이지로 이동"</strong> (Go to Kiosk Page) button.</li>
                </ul>
                <img src="/images/kiosk_tutorial/customer_step_1a_app_navigation.png" alt="Customer - Step 1A - Finding 'Go to Kiosk Page' button" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-700">Method B: Scanning a QR Code</h4>
                <p className="text-gray-600 mt-2">Locate the QR code displayed at the store. Use your smartphone's camera or a QR scanning app to scan it. This will take you directly to the store's kiosk page.</p>
                <img src="/images/kiosk_tutorial/customer_step_1b_qr_scan.png" alt="Customer - Step 1B - Customer scanning a QR code" className="mt-3 w-full max-w-xs mx-auto rounded-lg shadow-md border border-gray-200" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">2. Welcome to the Kiosk & Product Browsing</h3>
            <p className="text-gray-600 mb-3">The kiosk interface will load, displaying the store's name and a welcome message. Browse through product categories or scroll the product list.</p>
            <img src="/images/kiosk_tutorial/customer_step_2_welcome_browsing.png" alt="Customer - Step 2 - Kiosk main page with categories and products" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">3. Selecting and Customizing Your Product</h3>
            <p className="text-gray-600 mb-3">Tap on a product for details or to customize. If options (size, toppings) exist, a selection window appears. Make choices, see the price update, and confirm to add to cart.</p>
            <img src="/images/kiosk_tutorial/customer_step_3a_options_modal.png" alt="Customer - Step 3A - Product details/options modal" className="mt-3 mb-2 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            <img src="/images/kiosk_tutorial/customer_step_3b_item_added_to_cart.png" alt="Customer - Step 3B - Item added to cart confirmation" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">4. Reviewing and Modifying Your Cart</h3>
            <p className="text-gray-600 mb-3">A cart icon shows item count and total. Tap it to open your order summary. Review, change quantities, or remove items.</p>
            <img src="/images/kiosk_tutorial/customer_step_4_cart_summary.png" alt="Customer - Step 4 - Cart summary view" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">5. Proceeding to Checkout & Policy Review</h3>
            <p className="text-gray-600 mb-3">Happy with your order? Tap "Checkout" or a similar button. <strong>Important:</strong> Before payment, review and acknowledge the purchasing policies (Terms of Service, Privacy Policy, etc.).</p>
            <img src="/images/kiosk_tutorial/customer_step_5a_checkout_button.png" alt="Customer - Step 5A - Checkout button" className="mt-3 mb-2 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            <img src="/images/kiosk_tutorial/customer_step_5b_policy_screen.png" alt="Customer - Step 5B - Policy display/agreement screen" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">6. Payment and Order Confirmation</h3>
            <p className="text-gray-600 mb-3">Follow on-screen instructions to complete payment. A confirmation screen with your order number will appear upon success.</p>
            <img src="/images/kiosk_tutorial/customer_step_6_order_confirmation.png" alt="Customer - Step 6 - Successful order confirmation" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">7. Order Ready Notification</h3>
            <p className="text-gray-600 mb-3">The system will notify you (on-screen, sound, or vibration) when your order is ready for pickup.</p>
            <img src="/images/kiosk_tutorial/customer_step_7_order_ready_notification.png" alt="Customer - Step 7 - Order Ready notification" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>
        </div>
      </section>

      {/* Store Owner Tutorial Section */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-300">
          Store Owner Tutorial: Managing Your Kiosk
        </h2>
        <p className="mb-6 text-gray-600">
          This guide helps you set up and manage your store's kiosk effectively.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">1. Accessing Kiosk Management</h3>
            <p className="text-gray-600 mb-3">Log in to your SanggaTalk merchant dashboard. Navigate to your store's settings and find the "Kiosk Management" or "Edit Kiosk Display" section.</p>
            <p className="text-gray-600 mb-3"><strong>Note:</strong> Your store's unique Kiosk QR code is provided by us (SanggaTalk). Print and display it for customers.</p>
            <img src="/images/kiosk_tutorial/store_owner_step_1_dashboard_access.png" alt="Store Owner - Step 1 - Merchant dashboard Kiosk Management" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">2. Kiosk Configuration Dashboard</h3>
            <p className="text-gray-600 mb-3">This is your main control panel. You'll find sections for: Menu Builder, Order Dashboard, Active Sessions, Sales Reports, and Product Options Management.</p>
            <img src="/images/kiosk_tutorial/store_owner_step_2_config_dashboard.png" alt="Store Owner - Step 2 - Kiosk Configuration Dashboard overview" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">3. Setting Up Your Kiosk Menu</h3>
            <p className="text-gray-600 mb-3">Ensure products are in the system. Use the dual-panel layout ("Available Store Products" vs. "Kiosk Menu Layout") to drag products to the kiosk menu. Drag and drop items to reorder. Add, name, and position "Category Dividers".</p>
            <img src="/images/kiosk_tutorial/store_owner_step_3a_menu_editor.png" alt="Store Owner - Step 3A - Menu editor layout" className="mt-3 mb-2 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            <img src="/images/kiosk_tutorial/store_owner_step_3b_drag_drop_example.gif" alt="Store Owner - Step 3B - Drag and drop reordering example (GIF)" className="mt-3 mb-2 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            <p className="text-sm text-gray-500 text-center mt-1 mb-2">(Example: GIF showing reordering)</p>
            <img src="/images/kiosk_tutorial/store_owner_step_3c_product_edit_modal.png" alt="Store Owner - Step 3C - Product Edit/Create modal" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">4. Managing Product Availability and Details</h3>
            <p className="text-gray-600 mb-3">For products on your kiosk menu: toggle "Sold Out" status, or click to edit details (name, price, image) and assign/customize options.</p>
            <img src="/images/kiosk_tutorial/store_owner_step_4_product_availability.png" alt="Store Owner - Step 4 - Toggling 'Sold Out' and accessing product edit" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">5. Creating Reusable Product Options (Global Option Editor)</h3>
            <p className="text-gray-600 mb-3">In the "Global Product Options" editor, create option groups (e.g., "Drink Size") and choices with price adjustments (e.g., "Large" +$1.00). Apply these to multiple products.</p>
            <img src="/images/kiosk_tutorial/store_owner_step_5_global_options_editor.png" alt="Store Owner - Step 5 - Global Option Editor interface" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">6. Saving and Publishing Your Kiosk Menu</h3>
            <p className="text-gray-600 mb-3">After changes, click "Save Kiosk Configuration" or "Publish to Kiosks" to make updates live.</p>
            <img src="/images/kiosk_tutorial/store_owner_step_6_save_publish.png" alt="Store Owner - Step 6 - Save or Publish button" className="mt-3 w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-700 mb-3">7. Monitoring Kiosk Operations</h3>
            <p className="text-gray-600 mb-3">Regularly check your dashboard to: Manage Orders, View Active Sessions, and Review Sales Reports.</p>
            <img src="/images/kiosk_tutorial/store_owner_step_7a_order_management.png" alt="Store Owner - Step 7A - Order Management view" className="mt-3 mb-2 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            <img src="/images/kiosk_tutorial/store_owner_step_7b_sales_reports.png" alt="Store Owner - Step 7B - Active Sessions or Sales Report view" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
          </div>
        </div>
      </section>

      <footer className="mt-12 pt-6 border-t border-gray-300 text-center">
        <p className="text-gray-600">We hope this tutorial helps you make the most of the Kiosk feature!</p>
      </footer>
    </div>
  );
} 