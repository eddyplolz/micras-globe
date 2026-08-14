function legacyLoad() {
	$("[data-remodal-id=legacyNotice]").remodal().open();
	$(document).on('confirmation', '[data-remodal-id=legacyNotice]', function(e) {
		$.ajax({
			type: 'POST',
			url: '/save',
			data: {
				id: window.location.pathname.split('/')[1],
				key: urlParams["key"],
				images: urlParams,
				legacy: true,
				options: {
					blackBG: $("#blackBG").prop('checked'),
					transparentBG: $("#bgTransparent").prop('checked'),
					showPole: $("#poleOption").prop('checked'),
					atmosphere: {
						enabled: $("#atmosphere").prop('checked'),
						darkness: $("#nightDarkness").val(),
						rayleigh: $("#rScattering").val(),
						mie: $("#mScattering").val(),
						color: atmosphereColor
					},
					axialTilt: $("#axialTilt").val(),
					lightIntensity: $("#sunIntensity").val(),
					bgViewType: $("#bg2d").prop("checked") ? "2D" : "3D",
					heightmapType: $("#bumpHeight").prop("checked") ? "2D" : "3D",
					heightMapScale: $("#heightScale").val()
				}
			}
		}).done(function (data) {
			$(".loaderWrapper > #loading").text("LOADING");
			$(".loaderWrapper").hide();
			window.location = "/" + data[0];
			//history.pushState(data, "Map to Globe", "/" + data[0]);
		}).fail(function(err) {
			$("#errorMessage").html("<h2>Error!</h2><p>There was an error while trying to save:</p><p>" + err.responseText + "</p><p>Please try again. If the issue persists, please contact me.</p>");
			$("[data-remodal-id=modalError]").remodal().open();
		});
	});
}
