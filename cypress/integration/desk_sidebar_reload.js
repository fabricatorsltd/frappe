context("Desk sidebar reload", () => {
	before(() => {
		cy.login("Administrator", Cypress.env("adminPassword") || "admin");
	});

	it("keeps the company list shell stable on direct reload", () => {
		cy.visit("/desk/company");
		cy.location("pathname").should("eq", "/desk/company");
		cy.get(".page-head").should("exist");
		cy.get(".layout-main-section").should("exist");
		cy.get(".sidebar-header").should("exist");

		cy.reload();
		cy.location("pathname").should("eq", "/desk/company");
		cy.title().should("not.eq", "Frappe");
		cy.get(".page-head").should("exist");
		cy.get(".layout-main-section").should("exist");
		cy.get(".sidebar-header").should("exist");
		cy.get(".body-sidebar")
			.invoke("attr", "data-title")
			.should("be.a", "string")
			.and("not.be.empty");

		cy.window().then((win) => {
			const has_undefined_desk_request = win.performance
				.getEntriesByType("resource")
				.some((entry) => entry.name.includes("/desk/undefined"));

			expect(has_undefined_desk_request).to.eq(false);
		});
	});
});
