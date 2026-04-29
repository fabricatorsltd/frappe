context("Sidebar context persistence", () => {
	before(() => {
		cy.login("Administrator", Cypress.env("adminPassword") || "admin");
	});

	after(() => {
		cy.call("frappe.client.set_value", {
			doctype: "User",
			name: "Administrator",
			fieldname: "language",
			value: "en",
		});
	});

	function set_language(language) {
		cy.call("frappe.client.set_value", {
			doctype: "User",
			name: "Administrator",
			fieldname: "language",
			value: language,
		});
		cy.visit("/desk");
		cy.wait(1000);
		cy.window().then((win) => {
			win.localStorage.removeItem("sidebar_item_map");
		});
	}

	function assert_sales_invoice_refresh_keeps_selling_sidebar() {
		cy.visit("/desk/selling?sidebar=Selling");
		cy.get(".body-sidebar").should("have.attr", "data-title", "Selling");

		cy.get('.sidebar-item-container a.item-anchor[href="/desk/sales-invoice"]').first().click();
		cy.location("pathname").should("eq", "/desk/sales-invoice");
		cy.get(".body-sidebar").should("have.attr", "data-title", "Selling");

		cy.reload();
		cy.location("pathname").should("eq", "/desk/sales-invoice");
		cy.get(".body-sidebar").should("have.attr", "data-title", "Selling");

		cy.window().then((win) => {
			const sidebar_item_map = JSON.parse(win.localStorage.getItem("sidebar_item_map"));
			expect(sidebar_item_map).to.have.property("Sales Invoice", "Selling");
		});
	}

	it("keeps sidebar context after refresh in English", () => {
		set_language("en");
		assert_sales_invoice_refresh_keeps_selling_sidebar();
	});

	it("keeps sidebar context after refresh in translated UI", () => {
		set_language("fr");
		assert_sales_invoice_refresh_keeps_selling_sidebar();
	});
});
