const list_view = "/desk/todo";

// test round trip with filter types

const test_queries = [
	"?status=Open",
	`?date=%5B"Between"%2C%5B"2022-06-01"%2C"2022-06-30"%5D%5D`,
	`?date=%5B">"%2C"2022-06-01"%5D`,
	`?name=%5B"like"%2C"%2542%25"%5D`,
	`?status=%5B"not%20in"%2C%5B"Open"%2C"Closed"%5D%5D`,
	`?status=%5B%22%21%3D%22%2C%22Closed%22%5D&status=%5B%22%21%3D%22%2C%22Cancelled%22%5D`,
];

describe("SPA Routing", { scrollBehavior: false }, () => {
	before(() => {
		cy.login();
		cy.go_to_list("ToDo");
	});

	after(() => {
		cy.clear_filters(); // avoid flake in future tests
	});

	it("should apply filter on list view from route", () => {
		test_queries.forEach((query) => {
			const full_url = `${list_view}${query}`;
			cy.visit(full_url);
			cy.findByTitle("To Do").should("exist");

			const expected = new URLSearchParams(query);
			cy.location().then((loc) => {
				const actual = new URLSearchParams(loc.search);
				// This might appear like a dumb test checking visited URL to itself
				// but it's actually doing a round trip
				// URL with params -> parsed filters -> new URL
				// if it's same that means everything worked in between.
				expect(actual.toString()).to.eq(expected.toString());
			});
		});
	});

	it("should serialize generated route filters like list URLs", () => {
		cy.window()
			.its("frappe")
			.then((frappe) => {
				const equal_route = frappe.utils.generate_route({
					type: "DocType",
					name: "ToDo",
					doc_view: "List",
					route_options: { status: ["=", "Open"] },
				});

				const like_route = frappe.utils.generate_route({
					type: "DocType",
					name: "ToDo",
					doc_view: "List",
					route_options: { name: ["like", "%42%"] },
				});

				expect(equal_route).to.eq("/desk/todo/view/list?status=Open");
				expect(like_route).to.eq(
					"/desk/todo/view/list?name=%5B%22like%22%2C%22%2542%25%22%5D"
				);
			});
	});

	it("should clear stale route options when parsing a route without query params", () => {
		cy.window().then((win) => {
			win.history.replaceState(null, null, "/desk/todo");
			win.frappe.route_options = { status: "Open" };

			win.frappe.router.set_route_options_from_url();

			expect(win.frappe.route_options).to.deep.eq({});
		});
	});

	it("should clear stale route options on app links without query params", () => {
		cy.window().then((win) => {
			const original_set_route = win.frappe.set_route;
			const set_route_calls = [];

			win.frappe.set_route = (route) => {
				set_route_calls.push(route);
			};
			win.frappe.route_options = { status: "Open" };

			const link = win.document.createElement("a");
			link.href = "/desk/todo";
			win.document.body.appendChild(link);
			link.click();

			expect(win.frappe.route_options).to.deep.eq({});
			expect(set_route_calls).to.deep.eq(["/desk/todo"]);

			link.remove();
			win.frappe.set_route = original_set_route;
		});
	});

	it("should clear reused list filters when navigating to the plain route", () => {
		cy.visit("/desk/todo?status=Open");
		cy.findByTitle("To Do").should("exist");

		cy.window().then((win) => {
			const link = win.document.createElement("a");
			link.href = "/desk/todo";
			link.textContent = "Plain ToDo";
			win.document.body.appendChild(link);
			link.click();
		});

		cy.location("pathname").should("eq", "/desk/todo");
		cy.location("search").should("eq", "");
		cy.get(".filter-button").should("contain", "Filter").and("not.contain", "1");
		cy.window().then((win) => {
			expect(win.cur_list.filter_area.get()).to.deep.eq([]);
		});
	});

	it("should mark the sidebar item with matching query params as active", () => {
		cy.window().then((win) => {
			const sidebar = win.frappe.app.sidebar;
			const original_url = `${win.location.pathname}${win.location.search}`;
			const container = win.document.createElement("div");

			container.innerHTML = `
				<div id="generic-sidebar-item"><a class="item-anchor" href="/desk/sales-invoice/view/list">All Sales Invoice</a></div>
				<div id="sales-sidebar-item"><a class="item-anchor" href="/desk/sales-invoice/view/list?is_return=0">Sales Invoice</a></div>
				<div id="credit-sidebar-item"><a class="item-anchor" href="/desk/sales-invoice/view/list?is_return=1">Credit Note</a></div>
			`;
			win.document.body.appendChild(container);

			win.history.replaceState(null, null, "/desk/sales-invoice/view/list?is_return=1&page_length=20");
			sidebar.active_item = null;

			expect(sidebar.is_route_in_sidebar()).to.eq(true);
			expect(sidebar.active_item.attr("id")).to.eq("credit-sidebar-item");
			expect(
				sidebar.get_sidebar_item_match_score("/desk/sales-invoice/view/list?is_return=1")
			).to.be.greaterThan(sidebar.get_sidebar_item_match_score("/desk/sales-invoice/view/list"));

			win.history.replaceState(null, null, "/desk/sales-invoice/view/list?is_return=0");
			sidebar.active_item = null;

			expect(sidebar.is_route_in_sidebar()).to.eq(true);
			expect(sidebar.active_item.attr("id")).to.eq("sales-sidebar-item");

			container.remove();
			win.history.replaceState(null, null, original_url);
		});
	});
});
